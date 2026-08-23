declare module "react-native-rustore-review" {
  const client: {
    init(): void;
    requestReviewFlow(): Promise<boolean>;
    launchReviewFlow(): Promise<boolean>;
  };
  export default client;
}

declare module "react-native-rustore-update" {
  import type { EmitterSubscription } from "react-native";

  export enum Events {
    INSTALL_STATE_UPDATE = "InstallStateUpdate",
  }
  export enum ResultCode {
    RESULT_OK = -1,
    RESULT_CANCELED = 0,
    ACTIVITY_NOT_FOUND = 2,
  }
  export enum InstallStatus {
    UNKNOWN = 0,
    DOWNLOADED = 1,
    DOWNLOADING = 2,
    FAILED = 3,
    INSTALLING = 4,
    PENDING = 5,
  }
  export enum UpdateAvailability {
    UNKNOWN = 0,
    UPDATE_NOT_AVAILABLE = 1,
    UPDATE_AVAILABLE = 2,
    DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS = 3,
  }
  export enum AppUpdateType {
    FLEXIBLE = 0,
    IMMEDIATE = 1,
    SILENT = 2,
  }
  export interface InstallState {
    installStatus?: InstallStatus;
  }
  export interface AppUpdateInfo {
    updateAvailability: UpdateAvailability;
    installStatus: InstallStatus;
  }

  const client: {
    init(): void;
    getAppUpdateInfo(): Promise<AppUpdateInfo>;
    download(): Promise<ResultCode>;
    completeUpdate(type: number): Promise<boolean>;
  };
  export default client;
  export const eventEmitter: {
    addListener(event: Events, listener: (state: InstallState) => void): EmitterSubscription;
  };
}
