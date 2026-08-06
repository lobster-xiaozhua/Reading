export function formatRelativeTime(time: string | number): string {
  const now = Date.now();
  const then = typeof time === "string" ? new Date(time).getTime() : time;
  const diff = now - then;

  if (diff < 0) return "刚刚";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  const d = new Date(then);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
