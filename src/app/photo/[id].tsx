import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";

import { PhotoGrid } from "@/components/photos";
import { Card, PillButton, Screen, SectionHeader, Txt } from "@/components/ui";
import { Radius, Space, usePalette } from "@/constants/theme";
import * as db from "@/lib/db";
import { dayKey, formatFullDate, formatTime } from "@/lib/dates";
import { similarPhotos } from "@/lib/search";

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = usePalette();
  const { width } = useWindowDimensions();
  const [photo, setPhoto] = useState<db.Photo | null>(null);
  const [similar, setSimilar] = useState<db.Photo[]>([]);

  useEffect(() => {
    db.photoById(id).then(setPhoto);
    similarPhotos(id)
      .then(setSimilar)
      .catch(() => setSimilar([]));
  }, [id]);

  const imgW = width - 40;
  const ratio =
    photo && photo.width && photo.height ? photo.height / photo.width : 1;

  return (
    <Screen edges="none">
      <Image
        source={{ uri: id }}
        style={{
          width: imgW,
          height: Math.min(imgW * ratio, imgW * 1.4),
          borderRadius: Radius.lg,
          backgroundColor: c.surfaceAlt,
        }}
        contentFit="cover"
      />
      {photo && (
        <Card style={{ gap: Space.sm }}>
          <Txt variant="title">
            {photo.placeLabel ??
              (photo.lat != null ? "이름 없는 장소" : "위치 정보 없음")}
          </Txt>
          <Txt soft>
            {formatFullDate(photo.createdAt)} · {formatTime(photo.createdAt)}
          </Txt>
          <View style={{ marginTop: Space.sm }}>
            <PillButton
              label="이날 하루 보기"
              icon="calendar-outline"
              onPress={() =>
                router.push({
                  pathname: "/day/[date]",
                  params: { date: dayKey(photo.createdAt) },
                })
              }
            />
          </View>
        </Card>
      )}
      {similar.length > 0 && (
        <>
          <SectionHeader title="비슷한 사진" />
          <PhotoGrid photos={similar} />
        </>
      )}
    </Screen>
  );
}
