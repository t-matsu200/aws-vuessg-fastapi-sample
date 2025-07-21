import { useForm } from 'vee-validate';
import * as yup from 'yup';
import { useHttpClient } from '@/composables/http/useHttpClient';
import { HttpError } from '@/types/http';

/**
 * サンプルフォームのロジックをカプセル化する Composable 関数。
 * VeeValidate を使用したフォームのバリデーションと状態管理、
 * および HTTP クライアントを使用したフォームデータの送信を扱います。
 */
export const useSampleForm = () => {
  // Nuxt の提供する $log ヘルパーを使用
  const { $log } = useNuxtApp();

  // HTTP クライアントのインスタンスを取得。ファイルアップロードを含むPOSTリクエストに使用。
  const { postFormData } = useHttpClient();

  /**
   * フォームのバリデーションスキーマを定義。
   * yup を使用して各フィールドのバリデーションルールとエラーメッセージを設定。
   * - name: 必須
   * - email: 有効なメールアドレス形式かつ必須
   * - category: 必須
   * - file: 必須
   */
  const schema = yup.object({
    name: yup.string().required('名前は必須です'),
    email: yup.string().email('有効なメールアドレスではありません').required('メールアドレスは必須です'),
    category: yup.string().required('カテゴリーは必須です'),
    file: yup.mixed().required('ファイルは必須です'),
  });

  // VeeValidate の useForm フックを使用してフォームの状態とバリデーション機能を初期化。
  // validationSchema に上記で定義したスキーマを渡すことで、自動バリデーションが有効になる。
  const { handleSubmit, defineField, errors, values, resetForm } = useForm({
    validationSchema: schema,
    initialValues: {
      name: '',
      email: '',
      category: '',
      file: undefined,
    },
  });

  // defineField を使用して、フォームフィールドとそれに関連する属性（v-model, エラーなど）を定義。
  // これにより、テンプレートでのフォーム要素とのバインディングが容易になる。
  const [name, nameAttrs] = defineField('name');
  const [email, emailAttrs] = defineField('email');
  const [category, categoryAttrs] = defineField('category');
  const [file, fileAttrs] = defineField('file');

  /**
   * フォームデータをバックエンドに送信する非同期関数。
   * FormData オブジェクトを構築し、useHttpClient の postFormData メソッドを使用。
   * 成功または失敗の結果をオブジェクトとして返すことで、呼び出し元での柔軟なハンドリングを可能にする。
   */
  const submitForm = async () => {
    // FormData オブジェクトを構築。ファイルアップロードを含むフォーム送信に適している。
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('category', values.category);
    formData.append('file', values.file);

    try {
      // HTTP クライアント経由でフォームデータを送信。
      const response = await postFormData('/submit-sample-form', formData);
      $log.info('Form submission successful:', { response });
      return { success: true, response }; // 成功時は success: true とレスポンスを返す
    } catch (error) {
      // エラーが HttpError のインスタンスであるかを確認し、適切なエラーメッセージを構築。
      // これにより、バックエンドからの具体的なエラー情報をユーザーに提示できる。
      if (error instanceof HttpError) {
        $log.error('Form submission failed (HTTP Error):', { error: { message: error.message, statusCode: error.statusCode, stack: error.stack } });
        return { success: false, error: `フォーム送信に失敗しました (ステータス: ${error.statusCode}): ${error.message}` };
      } else if (error instanceof Error) {
        $log.error('Form submission failed (Generic Error):', { error: { message: error.message, stack: error.stack } });
        return { success: false, error: `フォーム送信に失敗しました: ${error.message}` };
      } else {
        $log.error('Form submission failed (Unknown Error):', { error });
        return { success: false, error: 'フォーム送信中に不明なエラーが発生しました' };
      }
    }
  };

  return {
    name,
    nameAttrs,
    email,
    emailAttrs,
    category,
    categoryAttrs,
    file,
    fileAttrs,
    errors,
    handleSubmit, // VeeValidate の handleSubmit を外部に公開。フォームの submit イベントにバインドされる。
    submitForm, // 実際にフォームデータを送信する関数。handleSubmit のコールバックとして使用される。
    resetForm, // フォームをリセットする関数
  };
};
