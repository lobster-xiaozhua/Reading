#!/usr/bin/env python3
"""测试平台专项精细控制 runner。

按层（unit/service/api/security/benchmark）或范围（quick/full）运行后端测试，
支持并行度、覆盖率、性能剖析、dry-run 与 JSON 报告输出。

用法:
  python3 scripts/test-platform/run.py [选项]

范围控制:
  --layer unit|service|api|security|benchmark   按层运行（可逗号组合，如 unit,service）
  --quick                                       unit+service 且排除 slow/benchmark（秒级回归）
  --full                                        全量（等同直接 pytest）
  --only-slow                                   仅运行 slow 测试
  --tests FILE [FILE...]                        显式指定测试文件（覆盖分层）

并行与资源:
  --jobs 0|N|auto                               0=单进程(默认)；N=指定 worker；auto=按 CPU 减半
  --no-xdist                                    完全禁用 xdist

输出:
  --coverage                                    生成 coverage 报告
  --profile                                     输出 slowest 15 用例
  --report PATH                                 输出 JSON 汇总（时长/通过/层分布）
  --report-dir PATH                             自动报告目录（按时间戳归档）
  --dry-run                                     仅收集并展示将运行的测试，不执行
  --fail-fast                                   首个失败立即停止
  --watch                                       文件监听模式（改动后重跑）

示例:
  python3 scripts/test-platform/run.py --layer unit
  python3 scripts/test-platform/run.py --quick
  python3 scripts/test-platform/run.py --layer api --jobs 2
  python3 scripts/test-platform/run.py --full --coverage --report test-report.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = ROOT / "tests"
PY = sys.executable

# ── 分层定义 ────────────────────────────────────────────────
UNIT_FILES = [
    "test_imports.py",
    "test_cache_utils.py",
    "test_sensitive_trie.py",
    "test_state_machine.py",
    "test_batch_utils.py",
    "test_property_algorithms.py",
]
API_FILES = ["test_api_b_end.py", "test_api_c_end.py", "test_rum.py"]
SECURITY_FILES = ["test_production_security.py"]
BENCHMARK_FILES = ["test_benchmarks.py"]


def service_files() -> list[str]:
    """service 层 = 所有 test_*_service.py + 非命名规则的 DB 测试。"""
    files = sorted(p.name for p in TESTS.glob("test_*_service.py"))
    files += ["test_discovery_cache.py"]
    return files


LAYERS: dict[str, list[str]] = {
    "unit": UNIT_FILES,
    "api": API_FILES,
    "security": SECURITY_FILES,
    "benchmark": BENCHMARK_FILES,
}
LAYERS["service"] = service_files()


def resolve_paths(layer_names: str) -> list[str]:
    """按层解析为具体测试文件路径。"""
    requested = [n.strip() for n in layer_names.split(",") if n.strip()]
    unknown = [n for n in requested if n not in LAYERS]
    if unknown:
        raise SystemExit(f"未知层: {', '.join(unknown)}；可选: {', '.join(LAYERS)}")
    paths = []
    for name in requested:
        for f in LAYERS[name]:
            p = TESTS / f
            if p.exists():
                paths.append(str(p))
    return paths


def build_cmd(args: argparse.Namespace, paths: list[str]) -> list[str]:
    """构造 pytest 命令行。"""
    cmd = [PY, "-m", "pytest"]
    cmd += ["--tb=short", "-q"]

    if args.no_xdist:
        cmd += ["-n", "0"]
    elif args.jobs != "0":
        cmd += ["-n", args.jobs]

    if args.quick:
        cmd += ["-m", "not slow and not benchmark"]
    elif args.only_slow:
        cmd += ["-m", "slow"]
    elif args.coverage and not args.full:
        cmd += ["-m", "not benchmark"]

    if args.coverage:
        cmd += [
            "--cov=app",
            "--cov-report=term-missing:skip-covered",
            "--cov-report=html:coverage_html",
        ]
    if args.profile:
        cmd += ["--durations=15"]

    cmd += ["--benchmark-disable"]

    if args.fail_fast:
        cmd.append("-x")

    if args.tests:
        for t in args.tests:
            p = Path(t)
            cmd.append(str(p if p.is_absolute() else (TESTS / p)))
    else:
        cmd += paths

    return cmd


def collect_names(cmd: list[str]) -> list[str]:
    """dry-run: 收集测试清单（解析 pytest 9 树状 collect 输出）。"""
    cc = list(cmd)
    cc[cc.index("--tb=short") : cc.index("--tb=short") + 1] = ["--co", "--color=no"]
    out = subprocess.run(cc, capture_output=True, text=True, cwd=ROOT)
    names = []
    for ln in out.stdout.splitlines():
        ln = ln.strip()
        for kind in ("<Coroutine ", "<Function ", "<AsyncFunction "):
            if ln.startswith(kind) and ln.endswith(">"):
                names.append(ln[len(kind) : -1])
                break
    return names


def main() -> int:
    parser = argparse.ArgumentParser(description="测试平台精细控制 runner")
    parser.add_argument("--layer", default=None, help="按层运行，可逗号组合")
    parser.add_argument("--quick", action="store_true", help="unit+service 且排除 slow/benchmark")
    parser.add_argument("--full", action="store_true", help="全量运行")
    parser.add_argument("--only-slow", action="store_true", help="仅运行 slow 测试")
    parser.add_argument("--tests", nargs="*", default=None, help="显式测试文件")
    parser.add_argument("--jobs", default="0", help="0=单进程(默认) N=worker auto=按CPU减半")
    parser.add_argument("--no-xdist", action="store_true", help="禁用 xdist")
    parser.add_argument("--coverage", action="store_true", help="生成 coverage 报告")
    parser.add_argument("--profile", action="store_true", help="输出 slowest 15")
    parser.add_argument("--report", default=None, help="JSON 报告路径")
    parser.add_argument("--report-dir", default=None,
                        help="自动报告目录（按时间戳归档报告）")
    parser.add_argument("--dry-run", action="store_true", help="仅收集展示")
    parser.add_argument("--fail-fast", "-x", action="store_true", help="首个失败立即停止")
    parser.add_argument("--watch", action="store_true",
                        help="文件监听模式（tests/ 或 src/ 改动后重跑）")
    args = parser.parse_args()

    if args.jobs == "auto":
        args.jobs = str(max(1, os.cpu_count() // 2 or 1))

    if args.tests:
        paths: list[str] = []
    elif args.layer:
        paths = resolve_paths(args.layer)
    elif args.quick:
        paths = resolve_paths("unit,service")
    elif args.only_slow or args.full:
        paths = [str(p) for p in sorted(TESTS.glob("test_*.py"))]
    else:
        parser.print_help()
        return 2

    cmd = build_cmd(args, paths)

    if args.dry_run:
        names = collect_names(cmd)
        print(f"[dry-run] 将运行 {len(names)} 个测试:")
        for n in names[:50]:
            print(f"  {n}")
        if len(names) > 50:
            print(f"  ... 其余 {len(names) - 50} 个")
        return 0

    start = time.monotonic()
    print(f"[test-platform] cwd={ROOT}")
    print(f"[test-platform] cmd={' '.join(cmd)}")
    rc = subprocess.run(cmd, cwd=ROOT).returncode
    elapsed = time.monotonic() - start

    if args.report:
        layer = args.layer or ("quick" if args.quick else ("full" if args.full else "custom"))
        report = {
            "layer": layer,
            "jobs": args.jobs,
            "exit_code": rc,
            "elapsed_sec": round(elapsed, 2),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "cmd": " ".join(cmd),
        }
        out = Path(args.report)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(f"[test-platform] 报告: {out}")

    if args.report_dir:
        layer = args.layer or ("quick" if args.quick else ("full" if args.full else "custom"))
        report = {
            "layer": layer,
            "jobs": args.jobs,
            "exit_code": rc,
            "elapsed_sec": round(elapsed, 2),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "cmd": " ".join(cmd),
        }
        out = Path(args.report_dir) / f"run-{time.strftime('%Y%m%d_%H%M%S')}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(f"[test-platform] 报告: {out}")

    print(f"[test-platform] 耗时 {elapsed:.1f}s, exit={rc}")

    if args.watch:
        print("[test-platform] 监听模式：tests/ 或 app/ 文件改动后自动重跑，Ctrl+C 退出")
        _watch_state = {"last_mtime": _get_max_mtime()}
        while True:
            _cur_mtime = _get_max_mtime()
            if _cur_mtime > _watch_state["last_mtime"]:
                _watch_state["last_mtime"] = _cur_mtime
                print("\n[test-platform] 检测到文件变更，重新运行...")
                subprocess.run(cmd, cwd=ROOT)
            time.sleep(1)

    return rc


def _get_max_mtime() -> float:
    """获取 tests/ 和 app/ 下所有 .py 文件的最新 mtime。"""
    candidates = [
        *TESTS.glob("**/*.py"),
        *ROOT.glob("app/**/*.py"),
    ]
    if not candidates:
        return 0.0
    return max(p.stat().st_mtime for p in candidates)


if __name__ == "__main__":
    raise SystemExit(main())
