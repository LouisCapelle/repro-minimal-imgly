import { Platform } from "react-native";
import {
  SerializationExportType,
  Configuration as VESDKConfiguration,
} from "react-native-videoeditorsdk";

export const getVESDKOptions = async (): Promise<VESDKConfiguration> => {
  const options: VESDKConfiguration = {
    export: {
      serialization: {
        enabled: true,
        exportType: SerializationExportType.OBJECT,
      },
      video: {
        segments: true,
      },
    },
  };

  switch (Platform.OS) {
    case "ios":
      options.focus = {
        ...(options.focus || {}),
        items: [],
      };
      break;
    case "android":
      options.export = {
        ...(options.export || {}),
        force: true,
      };
  }

  return options;
};
