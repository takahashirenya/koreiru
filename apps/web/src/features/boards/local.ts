export type SavedBoard = {
  title: string;
  adminToken: string;
  shareToken: string;
};
export type SavedRequest = {
  name: string;
  token: string;
  shareToken: string;
  itemId: string;
};
export function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
export function saveBoard(board: SavedBoard) {
  try {
    localStorage.setItem(
      "koreiru.boards",
      JSON.stringify([
        board,
        ...readLocal<SavedBoard>("koreiru.boards").filter(
          (b) => b.adminToken !== board.adminToken,
        ),
      ]),
    );
  } catch {
    /* URLは画面でも保存できる */
  }
}
export function saveRequest(request: SavedRequest) {
  try {
    localStorage.setItem(
      "koreiru.requests",
      JSON.stringify([
        request,
        ...readLocal<SavedRequest>("koreiru.requests").filter(
          (r) => r.token !== request.token,
        ),
      ]),
    );
  } catch {
    /* 確認URLを手動保存できる */
  }
}
