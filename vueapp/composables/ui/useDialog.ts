
import { useState } from '#app';

/**
 * アプリケーション全体で共有されるダイアログの状態を定義するインターフェース。
 */
interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// Nuxt 3のuseStateを使い、サーバーサイドとクライアントサイドで共有されるリアクティブな状態を作成
const useDialogState = () => useState<DialogState>('dialog-state', () => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
}));

/**
 * アプリケーション全体で通知ダイアログを制御するための Composable 関数。
 */
export const useDialog = () => {
  const dialogState = useDialogState();

  /**
   * ダイアログを開き、表示内容を設定します。
   * @param message ダイアログに表示するメッセージ。
   * @param title ダイアログのタイトル (オプション、デフォルトは '通知')。
   * @param type ダイアログの種類 (オプション、デフォルトは 'info')。
   */
  const openDialog = (message: string, title: string = '通知', type: DialogState['type'] = 'info') => {
    dialogState.value = {
      message,
      title,
      type,
      isOpen: true,
    };
  };

  /**
   * ダイアログを閉じます。
   */
  const closeDialog = () => {
    dialogState.value.isOpen = false;
  };

  return {
    dialogState,
    openDialog,
    closeDialog,
  };
};
