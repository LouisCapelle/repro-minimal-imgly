import { getVESDKOptions } from "@/utils/img-ly";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dimensions, StyleSheet, View } from "react-native";
import {
  Configuration,
  ForceTrimMode,
  VESDK,
} from "react-native-videoeditorsdk";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import * as FileSystem from "expo-file-system";

function getRandomInt(min, max) {
  min = Math.ceil(min); // S'assure que min est arrondi à l'entier le plus proche
  max = Math.floor(max); // S'assure que max est arrondi à l'entier le plus proche
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function App() {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);
  const [recording, setRecording] = useState(false);
  const [segments, setSegments] = useState(null);
  const [serialization, setSerialization] = useState(null);

  const openEditor = useCallback(async () => {
    const vesdkOptions = await getVESDKOptions();
    const vesdkConfig: Configuration = {
      composition: {
        personalVideoClips: true,
      },
      trim: {
        maximumDuration: 120.0,
        forceMode: ForceTrimMode.IF_NEEDED,
      },
      ...vesdkOptions,
    };
    const result = await VESDK.openEditor(segments, vesdkConfig, serialization);
  }, [serialization, segments]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  if (!hasPermission) return null;
  if (device == null) return null;

  return (
    <>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        ref={cameraRef}
        video={true}
      />
      <View
        style={{
          backgroundColor: recording ? "red" : "blue",
          position: "absolute",
          bottom: 50,
          left: Dimensions.get("screen").width / 2,
        }}
      >
        <Button
          title="record"
          onPress={() => {
            if (!recording) {
              setRecording(true);
              cameraRef.current?.startRecording({
                onRecordingFinished: async (video) => {
                  const videos = [video];
                  setRecording(false);
                  try {
                    if (!Array.isArray(videos))
                      throw new Error("ERROR: videos should be an array");
                    if (!videos?.length)
                      throw new Error(
                        "ERROR: videos array should not be empty"
                      );
                    const videoClips = videos.map(
                      (video: any, index: number) => {
                        return {
                          identifier: index.toString(),
                          videoURI: video?.path ?? video?.uri,
                        };
                      }
                    );
                    const vesdkOptions = await getVESDKOptions();
                    const vesdkConfig: Configuration = {
                      composition: {
                        personalVideoClips: true,
                      },
                      trim: {
                        forceMode: ForceTrimMode.IF_NEEDED,
                      },
                      ...vesdkOptions,
                    };

                    //Open the video editor and handle the export as well as any occuring errors

                    const result = await VESDK.openEditor(
                      videoClips,
                      vesdkConfig
                    );
                    if (result) {
                      //The user exported a new video successfully and the newly generated video is located at `result.video`.
                      console.log("result", result);
                      console.log("segments beforce", result?.segments);
                      const newSegments = result?.segments?.map(
                        async (segment) => {
                          const fileInfo = await FileSystem.getInfoAsync(
                            segment.videoURI.toString()
                          );
                          console.log("file info", fileInfo);
                          const newVideoURI =
                            FileSystem.cacheDirectory +
                            `export${getRandomInt(0, 1000)}_imgly.mp4`;
                          const resultFile = await FileSystem.copyAsync({
                            from: fileInfo?.uri,
                            to: newVideoURI,
                          });
                          console.log("result ilesystem", resultFile);
                          return {
                            ...segment,
                            videoURI: newVideoURI,
                          };
                        }
                      );
                      setSegments(newSegments);
                      setSerialization(serialization);
                      // @ts-ignore
                    } else {
                      //User quits img.ly editing process: stay on camera
                    }
                  } catch (error) {
                    console.log(
                      `file: useSendNox.tsx ~ onMediaCaptured: ~ error:`,
                      error
                    );
                  }
                },
                onRecordingError: (error) => console.error(error),
              });
            } else {
              cameraRef.current?.stopRecording();
            }
          }}
        />

        {segments && serialization && (
          <Button title="re open editor" onPress={openEditor} />
        )}
      </View>
    </>
  );
}
