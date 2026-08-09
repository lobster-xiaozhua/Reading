/* ============================================================
 * P5-8 · VIP 订阅页
 * 权益卡 + 套餐选择 + 支付方式 + 吸底提交栏
 * VIP 区域统一 accent-orange 暖橙主调（区别于普通页 brand 蓝）
 * ============================================================ */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Skeleton, useAsyncState, useFeedback } from "@novel/components";
import {
  StatusSuccess,
  StatusPending,
  NavigationBack,
  NovelCrown,
} from "@novel/icons";
import { fetcher } from "@/api/fetcher";
import type { PaymentMethodItem, UserProfile, VipPlan } from "@/api/types";
import "./VipPage.css";

const BENEFITS = [
  "全站 VIP 章节免费读",
  "去广告 · 双倍月票",
  "专属徽章 · 优先催更",
  "专属客服 · 离线下载",
];

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function VipPage() {
  const navigate = useNavigate();
  const { message } = useFeedback();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );

  /* 下单闭环状态 */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  /* ---------- 数据加载 ---------- */
  const plansState = useAsyncState<VipPlan[]>(() => fetcher.getVipPlans(), {
    initial: [] as VipPlan[],
    loadingDelay: 200,
  });
  const paymentsState = useAsyncState<PaymentMethodItem[]>(
    () => fetcher.getPaymentMethods(),
    { initial: [] as PaymentMethodItem[], loadingDelay: 200 },
  );
  const userState = useAsyncState<UserProfile>(() => fetcher.getCurrentUser(), {
    loadingDelay: 200,
  });

  const plans = plansState.data ?? [];
  const payments = paymentsState.data ?? [];
  const user = userState.data ?? null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const totalPrice = selectedPlan?.totalPrice ?? 0;
  const plansLoading = plansState.loading && plans.length === 0;
  const selectedPayment =
    payments.find((m) => m.id === selectedPaymentId) ?? null;

  /* ---------- 提交：确认 → 模拟支付 → 成功 ---------- */
  const openConfirm = () => {
    if (!selectedPlanId) {
      message("warning", "请选择套餐");
      return;
    }
    if (!selectedPaymentId) {
      message("warning", "请选择支付方式");
      return;
    }
    setPaid(false);
    setConfirmOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedPlanId || !selectedPaymentId) return;
    setPaying(true);
    try {
      await fetcher.createVipOrder(selectedPlanId, selectedPaymentId);
      setPaid(true);
      await userState.run();
    } catch {
      message("error", "支付失败，请稍后重试");
      setConfirmOpen(false);
    } finally {
      setPaying(false);
    }
  };

  const closeConfirm = () => {
    if (paying) return;
    setConfirmOpen(false);
  };

  const handleSelectPlan = (plan: VipPlan) => {
    if (plan.expired) return;
    setSelectedPlanId(plan.id);
  };

  return (
    <div className="vip-page container-page fade-in">
      {/* 返回 */}
      <button
        type="button"
        className="vip-page__back"
        aria-label="返回上一页"
        onClick={() => navigate(-1)}
      >
        <NavigationBack size="sm" aria-hidden="true" />
        <span>返回</span>
      </button>

      {/* 已是 VIP 提示 */}
      {user?.isVip ? (
        <div className="vip-page__vip-banner" role="status">
          <span className="vip-page__vip-banner-text">
            您已是 VIP 会员，到期时间{" "}
            {user.vipExpireAt ? formatDate(user.vipExpireAt) : "—"}
          </span>
          <button
            type="button"
            className="vip-page__renew-btn"
            aria-label="续费 VIP"
            onClick={openConfirm}
          >
            续费
          </button>
        </div>
      ) : null}

      {/* 1. VIP 权益卡 */}
      <section className="vip-page__benefit" aria-label="VIP 权益">
        <h1 className="vip-page__benefit-title">
          <span className="vip-page__benefit-star" aria-hidden>
            <NovelCrown size="sm" aria-hidden="true" />
          </span>
          <span>VIP 会员 尊享全站精品</span>
        </h1>
        <ul className="vip-page__benefit-list">
          {BENEFITS.map((b) => (
            <li key={b} className="vip-page__benefit-item">
              {user?.isVip ? (
                <StatusSuccess
                  size="sm"
                  className="vip-page__benefit-icon is-unlocked"
                  aria-hidden="true"
                />
              ) : (
                <span className="vip-page__benefit-icon is-pending" aria-hidden>
                  <StatusPending size="sm" />
                </span>
              )}
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. 套餐选择 */}
      <section className="vip-page__section" aria-label="选择套餐">
        <h2 className="vip-page__section-title">选择套餐</h2>
        {plansLoading ? (
          <div className="vip-page__plans vip-page__plans--loading">
            <Skeleton rows={4} />
          </div>
        ) : (
          <div
            className="vip-page__plans"
            role="radiogroup"
            aria-label="VIP 套餐"
          >
            {plans.map((plan) => {
              const selected = plan.id === selectedPlanId;
              const expired = plan.expired === true;
              const cls = [
                "vip-page__plan",
                selected ? "is-selected" : "",
                expired ? "is-expired" : "",
                plan.recommended ? "is-recommended" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`套餐：${plan.name}，月均 ${plan.pricePerMonth} 元`}
                  className={cls}
                  disabled={expired}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.recommended ? (
                    <span className="vip-page__plan-badge" aria-hidden>
                      省最多
                    </span>
                  ) : null}
                  {plan.originalPrice > plan.pricePerMonth ? (
                    <span className="vip-page__plan-save" aria-hidden>
                      省 ¥{plan.originalPrice - plan.pricePerMonth}/月
                    </span>
                  ) : null}
                  <span className="vip-page__plan-name">{plan.name}</span>
                  <span className="vip-page__plan-price">
                    <span className="vip-page__plan-currency">¥</span>
                    <span className="vip-page__plan-num">
                      {plan.pricePerMonth}
                    </span>
                    <span className="vip-page__plan-unit">/月</span>
                  </span>
                  <span className="vip-page__plan-original">
                    原价 ¥{plan.originalPrice}/月
                  </span>
                  {plan.discount ? (
                    <span className="vip-page__plan-discount">
                      {plan.discount}
                    </span>
                  ) : null}
                  {expired ? (
                    <span className="vip-page__plan-expired-tag">已过期</span>
                  ) : null}
                  {selected && !expired ? (
                    <span className="vip-page__plan-check" aria-hidden>
                      <StatusSuccess size="sm" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. 支付方式 */}
      <section className="vip-page__section" aria-label="选择支付方式">
        <h2 className="vip-page__section-title">支付方式</h2>
        <div
          className="vip-page__payments"
          role="radiogroup"
          aria-label="支付方式"
        >
          {payments.map((m) => {
            const selected = m.id === selectedPaymentId;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={m.name}
                className={`vip-page__payment ${selected ? "is-selected" : ""}`}
                onClick={() => setSelectedPaymentId(m.id)}
              >
                <span className="vip-page__payment-icon" aria-hidden>
                  {m.icon}
                </span>
                <span className="vip-page__payment-name">{m.name}</span>
                <span className="vip-page__payment-dot" aria-hidden />
              </button>
            );
          })}
        </div>
      </section>

      {/* 吸底栏占位，避免遮挡内容 */}
      <div className="vip-page__submit-spacer" aria-hidden />

      {/* 4. 底部提交栏 */}
      <div className="vip-page__submit-bar">
        <div className="vip-page__total">
          <span className="vip-page__total-line">
            <span className="vip-page__total-label">合计</span>
            <span className="vip-page__total-num">¥{totalPrice}</span>
          </span>
          <span className="vip-page__total-plan">
            {selectedPlan ? selectedPlan.name : "未选择套餐"}
          </span>
        </div>
        <button
          type="button"
          className="vip-page__submit-btn"
          aria-label="立即开通 VIP"
          onClick={openConfirm}
        >
          立即开通
        </button>
      </div>

      {/* 5. 确认 / 支付中 / 成功 弹窗 */}
      <Modal
        open={confirmOpen}
        onCancel={closeConfirm}
        title={paid ? "开通成功" : "确认支付"}
        width={420}
        closable={!paying}
        maskClosable={!paying}
        footer={
          paid ? (
            <div className="vip-page__modal-footer">
              <button
                type="button"
                className="vip-page__modal-btn vip-page__modal-btn--primary"
                onClick={() => {
                  setConfirmOpen(false);
                  setSelectedPlanId(null);
                  setSelectedPaymentId(null);
                }}
              >
                好的，开始阅读
              </button>
            </div>
          ) : (
            <div className="vip-page__modal-footer">
              <button
                type="button"
                className="vip-page__modal-btn"
                disabled={paying}
                onClick={closeConfirm}
              >
                取消
              </button>
              <button
                type="button"
                className="vip-page__modal-btn vip-page__modal-btn--primary"
                disabled={paying}
                onClick={handleConfirmPay}
              >
                {paying ? "支付中..." : `确认支付 ¥${totalPrice}`}
              </button>
            </div>
          )
        }
      >
        {paid ? (
          <div className="vip-page__paid">
            <span className="vip-page__paid-icon" aria-hidden>
              <StatusSuccess size="xl" />
            </span>
            <p className="vip-page__paid-title">
              {selectedPlan?.name} 开通成功
            </p>
            <p className="vip-page__paid-sub">
              已顺延至{" "}
              {user?.vipExpireAt ? formatDate(user.vipExpireAt) : "会员期"}
              ，全站 VIP 章节现已可读
            </p>
          </div>
        ) : (
          <div className="vip-page__confirm">
            <div className="vip-page__confirm-row">
              <span className="vip-page__confirm-label">套餐</span>
              <span className="vip-page__confirm-value">
                {selectedPlan?.name}
              </span>
            </div>
            <div className="vip-page__confirm-row">
              <span className="vip-page__confirm-label">支付方式</span>
              <span className="vip-page__confirm-value">
                {selectedPayment?.name}
              </span>
            </div>
            <div className="vip-page__confirm-row">
              <span className="vip-page__confirm-label">支付金额</span>
              <span className="vip-page__confirm-price">¥{totalPrice}</span>
            </div>
            {paying && (
              <p className="vip-page__paying">
                <span className="vip-page__paying-spinner" aria-hidden />
                正在支付，请稍候...
              </p>
            )}
            <p className="vip-page__confirm-note">
              演示环境：支付为模拟流程，下单即开通会员。
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
