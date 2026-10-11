# Sussy / 001 — Portfolio

Portfolio one-page bằng Vinext (tương thích Next.js App Router), React 19, TypeScript và Three.js.
Nhân vật Roblox **Sussy** (model R6 `R6_SussySuspector_1265476893` trong Roblox Studio) chạy theo nhịp cuộn trang:
mở đầu → băng chuyền tech stack dưới chân → dự án → ngồi dưới gốc cây ngắm hoàng hôn ở phần liên hệ.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra và build

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Test trình duyệt (Playwright, dùng Chrome cài sẵn): `npm run test:e2e` tự bật dev server ở cổng 3100,
hoặc `E2E_BASE_URL=http://localhost:3000 npm run test:e2e` để dùng server đang chạy.

Vitest kiểm tra toán học scroll, rig/clip R6 và parser/CLI bằng fixture `.rbxm`
trong `tests/fixtures`, đối chiếu với `public/anims`. Dùng `npm run test:watch`
khi chỉnh logic; test không cần Studio hay kết nối mạng.

## Chỉnh nội dung

Mọi nội dung nằm trong `data/portfolio.ts`:

- `contacts`: điện thoại, Gmail, LinkedIn, Facebook, GitHub, Roblox. Để trống `value` thì UI hiện "Đang cập nhật".
- `techStack`: mỗi mục là một model 3D trên băng chuyền (logo SVG 24×24 từ `simple-icons`, extrude bằng Three.js).
  Thêm tech mới = thêm một dòng `tech(...)`; chiều dài chương tự giãn theo số lượng.
- `projects`, `experience`, `about`.

## Kiến trúc

```
components/story/portfolio-story.tsx    overlay HTML theo 4 chương, scroll → story (0..4)
components/story/portfolio-shell.tsx    shell trong layout chung, giữ canvas khi đổi Dev ↔ Roblox
components/story/scene/story-scene.ts   renderer WebGL duy nhất, camera theo keyframe, adaptive DPR
components/story/scene/tech-carousel.ts băng chuyền logo + hiệu ứng focus/hover
components/story/scene/environment.ts   sky shader, sàn studio, đồi hoàng hôn, cây, cỏ, đom đóm
components/story/loading-screen.tsx     đầu Sussy 2D xoay như đồng xu khi tải
lib/rbx/rig.ts                          rig R6 (Motor6D C0/C1) + KeyframeSequence → AnimationClip
lib/story.ts                            toán học chương/slideshow dùng chung
```

## Pipeline asset

### Animation (`public/anims`)

Trích trực tiếp từ gói `Ultimate R6 Movement System.rbxm` (không cần Roblox Studio):

```bash
npm run extract:anims -- "/đường/dẫn/Ultimate R6 Movement System.rbxm" public/anims
```

Script đọc chunk `INST/PROP/PRNT` (giải nén LZ4), xuất mỗi `KeyframeSequence` thành JSON và C0/C1 của Motor6D vào `index.json`.
Web đang dùng `run-v4` và `idle-v2`; tư thế ngồi được tạo trong `createSitClip()`.

### Nhân vật Sussy (`public/models/sussy/sussy-r6.glb`)

1. `assets-src/sussy/parts.json`: transform/kích thước từng part, dump từ Studio (tương đối HumanoidRootPart).
2. `assets-src/sussy/meshes/*.json`: mesh gốc Roblox, giải mã bằng `scripts/rbxmesh-to-json.mjs` (mesh v2–v7, Draco).
   Asset công khai lấy từ assetdelivery; asset cần đăng nhập lấy từ cache nội bộ của Roblox Studio
   (`$TMPDIR/Roblox/rbx-storage`, texture KTX2 BC1 + zstd giải mã sang PNG).
3. `scripts/blender/build-sussy.py`: import vào Blender: khối R6 bo nhẹ + phụ kiện SpecialMesh gắn vào part R6 tương ứng, làm mượt normal,
   subdivide đầu, gán vật liệu PBR, xuất GLB. File `.blend` lưu ở `assets-src/sussy/sussy-r6.blend`.
4. `npm run optimize:model`: nén meshopt + WebP (≈860 KB → ≈270 KB).

```bash
npm run build:model
```

### Màn hình demo ở các trạm

Mỗi dự án có thể khai báo `image` (trong `data/portfolio.ts`): một khung hình 640×360 WebP trong `public/projects/`,
được chiếu trên màn hình neon của trạm dừng (`components/story/scene/milestones.ts`). Các khung hiện có được chụp từ chính
trang này bằng Playwright (`/?debug` + `window.__go(story)`, ẩn lớp chữ) rồi nén bằng `cwebp -q 76 -resize 640 360`.
Dự án chưa có demo thì màn hình hiện “DEMO // COMING SOON”.

### Cây, cỏ và con đường hoàng hôn

`scripts/blender/build-nature.py` dựng cây (thân thuôn, rễ, cành, tán lá là các khối cầu mềm), bụi, cụm cỏ và dương xỉ
trong Blender. Toàn bộ sắc độ (bóng tối trong tán, viền nắng ấm phía mặt trời) nằm trong màu đỉnh nên web chỉ cần một vật liệu
cho mỗi loại. Cỏ, dương xỉ và bụi được instance hàng nghìn lần dọc con đường; gió là một shader nhỏ chèn qua `onBeforeCompile`.

```bash
npm run build:nature   # Blender headless + meshopt → public/models/nature/nature.glb (≈145 KB)
```

Lưu ý: meshopt lượng tử hoá vị trí đỉnh và đặt phép giải lượng tử lên node, nên `bakedGeometry()` trong
`components/story/scene/environment.ts` đưa ma trận node vào geometry trước khi đặt lại vị trí cây hay instance cỏ.

`public/brand/sussy-egg.webp` (đầu trứng không mũ, không kính, lăn tròn trên màn hình loading; nhúng vào `lib/brand.ts`, render bằng `scripts/blender/render-egg-sprite.py`), `sussy-head.webp` (đầu có mũ và kính, dùng làm favicon `app/icon.png` / `app/apple-icon.png`) và `sussy-poster.webp` (fallback khi không có WebGL) được render từ cùng file Blender. Thẻ chia sẻ `public/brand/og-{dev,roblox}.jpg` tạo bằng `python3 scripts/og/make-og.py`.

## Hiệu năng & trợ năng

- Một canvas cố định, dừng render khi tab ẩn, DPR tự hạ khi FPS < 45; chỉ tăng lại sau hai mẫu ổn định.
  Làm nóng shader trước khi hiện scene, bóng tiếp xúc giả thay cho shadow map.
- Dev ↔ Roblox dùng chung avatar/renderer; màn che đầu Sussy và camera lùi nhẹ, giữ tiến độ chương dù stack dài khác nhau.
- Three.js được tách chunk và tải động sau khi chữ đã hiển thị.
- Nút "Giảm chuyển động" (nhớ theo trình duyệt) và tôn trọng `prefers-reduced-motion`: tắt nội suy/animation CSS,
  giữ tư thế idle; chỉ vẽ lại scene khi thay đổi vị trí cuộn, con trỏ hoặc kích thước.
- Danh sách tech có bản HTML (chip) dùng được bằng bàn phím: Tab / ← →.
- Hook `window.__sussyScene` chỉ bật trong dev với `/?debug` hoặc `/roblox?debug`.

Chưa có kết quả FPS trên thiết bị thật hoặc Lighthouse cho pass Codex này; xem giới hạn kiểm tra trong `HANDOFF.md`.
