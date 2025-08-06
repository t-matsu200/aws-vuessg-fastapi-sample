export interface EnvironmentConfig {
  systemName: string;
  repositoryName: string;
  branchName: string;
  frontendBucketName: string;
  parameterStoreCodePipelineArtifactBucketName: string;
  // 他の環境依存の変数をここに追加できます
}
