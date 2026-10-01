export async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(error.message)
        ? error.message.join(" / ")
        : error.message || "通信に失敗しました。もう一度お試しください。",
    );
  }
  return response.json();
}
export const body = (value: unknown) => JSON.stringify(value);
export function imageUrl(
  token: string,
  item: string,
  image: string,
  owner: boolean,
) {
  return owner
    ? `/api/manage/boards/${token}/items/${item}/images/${image}`
    : `/api/share/${token}/items/${item}/images/${image}`;
}
export const absoluteUrl = (path: string) => `${location.origin}${path}`;
