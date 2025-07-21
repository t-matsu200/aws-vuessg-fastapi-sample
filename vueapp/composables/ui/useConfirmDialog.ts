import { ref } from 'vue';

/**
 * 確認ダイアログの現在の状態を定義するインターフェース。
 * - isOpen: ダイアログが表示されているかどうかのフラグ。
 * - title: ダイアログのタイトル。
 * - message: ダイアログに表示されるメッセージ。
 * - resolve: Promise を解決するための関数。ユーザーの選択 (true/false) を呼び出し元に返します。
 */
interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  resolve: ((value: boolean | PromiseLike<boolean>) => void) | null; // Promise を解決するためのコールバック
}

/**
 * 確認ダイアログのリアクティブな状態を保持する ref オブジェクト。
 * アプリケーション全体で単一の確認ダイアログインスタンスを管理するために使用されます。
 */
const confirmDialogState = ref<ConfirmDialogState>({
  isOpen: false,
  title: '',
  message: '',
  resolve: null, // 初期状態では解決関数は null
});

/**
 * アプリケーション全体で確認ダイアログを制御するための Composable 関数。
 * ダイアログの表示状態と内容を管理し、ユーザーの選択結果を Promise で返します。
 */
export const useConfirmDialog = () => {
  /**
   * 確認ダイアログを開き、ユーザーの選択を待ちます。
   * @param message ダイアログに表示するメッセージ。
   * @param title ダイアログのタイトル (オプション、デフォルトは '確認')。
   * @returns ユーザーが OK を押した場合は true、キャンセルした場合は false を解決する Promise。
   */
  const openConfirmDialog = (message: string, title: string = '確認'): Promise<boolean> => {
    confirmDialogState.value.message = message;
    confirmDialogState.value.title = title;
    confirmDialogState.value.isOpen = true;

    // Promise を返し、その解決関数を状態に保存することで、
    // ダイアログが閉じられたときに Promise を解決できるようにします。
    return new Promise((resolve) => {
      confirmDialogState.value.resolve = resolve;
    });
  };

  /**
   * 確認ダイアログを閉じ、ユーザーの選択結果を Promise に返します。
   * @param result ユーザーの選択結果 (true: OK, false: キャンセル)。
   */
  const closeConfirmDialog = (result: boolean) => {
    // Promise の解決関数が存在する場合、結果を渡して解決します。
    if (confirmDialogState.value.resolve) {
      confirmDialogState.value.resolve(result);
    }
    confirmDialogState.value.isOpen = false;
    confirmDialogState.value.resolve = null; // 解決関数をリセット
  };

  return {
    confirmDialogState, // 確認ダイアログの現在の状態
    openConfirmDialog,  // 確認ダイアログを開く関数
    closeConfirmDialog, // 確認ダイアログを閉じる関数
  };
};