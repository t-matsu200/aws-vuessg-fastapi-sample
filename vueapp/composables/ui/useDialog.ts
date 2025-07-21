import { ref } from 'vue';

/**
 * アプリケーション全体で共有されるダイアログの状態を定義するインターフェース。
 * - isOpen: ダイアログが表示されているかどうかのフラグ。
 * - title: ダイアログのタイトル。
 * - message: ダイアログに表示されるメッセージ。
 * - type: ダイアログの種類（情報、成功、エラー、警告など）に応じてスタイルを適用するためのもの。
 */
interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

/**
 * ダイアログのリアクティブな状態を保持する ref オブジェクト。
 * アプリケーション全体で単一のダイアログインスタンスを管理するために使用されます。
 */
const dialogState = ref<DialogState>({
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
});

/**
 * アプリケーション全体で通知ダイアログを制御するための Composable 関数。
 * ダイアログの表示状態と内容を管理し、ダイアログを開閉するメソッドを提供します。
 */
export const useDialog = () => {
  /**
   * ダイアログを開き、表示内容を設定します。
   * @param message ダイアログに表示するメッセージ。
   * @param title ダイアログのタイトル (オプション、デフォルトは '通知')。
   * @param type ダイアログの種類 (オプション、デフォルトは 'info')。
   */
  const openDialog = (message: string, title: string = '通知', type: DialogState['type'] = 'info') => {
    dialogState.value.message = message;
    dialogState.value.title = title;
    dialogState.value.type = type;
    dialogState.value.isOpen = true;
  };

  /**
   * ダイアログを閉じます。
   */
  const closeDialog = () => {
    dialogState.value.isOpen = false;
  };

  return {
    dialogState, // ダイアログの現在の状態
    openDialog,  // ダイアログを開く関数
    closeDialog, // ダイアログを閉じる関数
  };
};