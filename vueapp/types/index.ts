/**
 * ドロップダウンリストなどの項目を表すインターフェース。
 * value は内部的な値、label は表示用のテキストとして使用されます。
 */
export interface ListItems {
  value: string | number;
  label: string;
}