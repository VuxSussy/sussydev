# Personal Portfolio

Website portfolio one-page bằng Vinext (tương thích Next.js App Router), React và TypeScript.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra và build

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Chỉnh nội dung

Toàn bộ thông tin cá nhân, kỹ năng, dự án, kinh nghiệm và liên kết mạng xã hội nằm trong `data/portfolio.ts`. Thay nội dung mẫu bằng dữ liệu thật; các section sẽ tự cập nhật.

## Thêm model 3D

1. Đặt file `.glb` hoặc `.gltf` đã tối ưu vào `public/models/`.
2. Trong `data/portfolio.ts`, thêm `src: "/models/ten-model.glb"` vào mục tương ứng trong `models3d`.
3. Có thể thêm nhiều mục vào mảng `models3d`; bộ chọn trong hero sẽ tự mở rộng.

Mỗi model nên được nén texture, giới hạn polygon hợp lý và ưu tiên định dạng GLB. Khi chưa có `src`, giao diện dùng một sculpture hình học nhẹ làm fallback để không xuất hiện vùng trống.
