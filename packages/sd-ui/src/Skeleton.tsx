export function Skeleton({
  height = 80,
  width,
  rounded = 6,
}: {
  height?: number | string;
  width?: number | string;
  rounded?: number;
}) {
  return (
    <div
      className="sd-skel"
      style={{ height, width: width ?? "100%", borderRadius: rounded }}
    />
  );
}
