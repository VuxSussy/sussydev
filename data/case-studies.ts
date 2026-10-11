/**
 * Long-form case studies keyed by project slug (see `Project.slug` in data/portfolio.ts).
 * Only write what actually happened; projects without an entry show a "being written" page.
 */
export type CaseStudy = {
  intro: string;
  stack: string[];
  /** Short facts shown as a stat row. */
  facts: { label: string; value: string }[];
  sections: { title: string; paragraphs: string[] }[];
};

export const caseStudies: Record<string, CaseStudy> = {
  "portfolio-3d": {
    intro:
      "Một portfolio kể chuyện bằng chuyển động: nhân vật Roblox của tôi chạy theo nhịp cuộn trang, qua băng chuyền tech stack, ra khỏi studio theo con đường đất, rồi ngồi dưới gốc cây ngắm hoàng hôn ở phần liên hệ.",
    stack: ["Vinext / Next.js App Router", "React 19", "TypeScript", "Three.js", "Blender", "Vitest"],
    facts: [
      { label: "Model nhân vật", value: "≈255 KB" },
      { label: "Test tự động", value: "60 + e2e" },
      { label: "Portfolio", value: "2 chế độ" },
    ],
    sections: [
      {
        title: "Bài toán",
        paragraphs: [
          "Tôi muốn portfolio có cá tính riêng nhưng vẫn đọc được như một trang bình thường: chữ phải hiện ngay, 3D chỉ là lớp kể chuyện phía sau.",
          "Nội dung được chia thành bốn chương. Mỗi chương đóng góp 0→1 vào một giá trị “story” liên tục, nên camera, nhân vật và môi trường đều là hàm thuần của vị trí cuộn — cuộn ngược lại trông y hệt.",
        ],
      },
      {
        title: "Một sân khấu duy nhất",
        paragraphs: [
          "Toàn trang chỉ có một WebGL renderer cố định phía sau nội dung HTML, được tải động sau khi chữ đã hiển thị. Khi đổi giữa portfolio Dev và Roblox, renderer và nhân vật được giữ nguyên; chỉ theme, tech stack và nội dung thay đổi.",
          "Ánh sáng dùng tone mapping AgX, môi trường PMREM và bóng tiếp xúc giả thay cho shadow map. Độ phân giải tự hạ khi FPS thấp và vòng render dừng hẳn khi tab bị ẩn.",
        ],
      },
      {
        title: "Từ studio ra hoàng hôn",
        paragraphs: [
          "Phần tech stack diễn ra trong một studio tối, còn phần liên hệ là đồi cỏ lúc hoàng hôn. Để hai cảnh không bị cắt ngang, phần dự án trở thành một hành trình: băng chuyền tắt, một cánh cửa sáng mở ra, Sussy chạy ra con đường đất, ngang qua các cột mốc ghi số và năm của từng dự án, trời ngả dần sang hoàng hôn, rồi dừng lại ngồi dưới gốc cây, quay mặt về phía người xem.",
          "Cây, bụi, cỏ và dương xỉ dựng bằng script Python trong Blender. Bóng tối bên trong tán lá và viền nắng ấm được tính sẵn vào màu đỉnh, nên trên web mỗi loại chỉ cần một vật liệu; cỏ được instance hàng nghìn lần và đung đưa bằng một shader gió nhỏ.",
        ],
      },
      {
        title: "Từ Roblox Studio đến trình duyệt",
        paragraphs: [
          "Animation chạy, đứng và nhảy được trích trực tiếp từ file .rbxm bằng một parser tự viết; nhân vật được lấy từ Roblox Studio, chỉnh chất lượng trong Blender rồi nén meshopt. Chi tiết nằm ở hai case study “Sussy” và “Animation R6 lên web”.",
        ],
      },
      {
        title: "Giữ cho nó luôn phát triển",
        paragraphs: [
          "Website được làm theo từng phiên bản nhỏ, mỗi bản đều ghi vào trang Nhật ký. Logic quan trọng — toán học cuộn trang, rig R6, bộ trích animation — có test tự động để có thể thay đổi mạnh tay mà không sợ vỡ.",
        ],
      },
    ],
  },
  sussy: {
    intro:
      "Sussy là avatar Roblox của tôi: đầu trắng mắt “sus”, mũ Trilby với kính pixel, khăn đen và thắt lưng chiến thuật. Mục tiêu là đưa đúng nhân vật đó từ Roblox Studio lên web, không vẽ lại.",
    stack: ["Roblox Studio", "Luau", "Blender 5", "Python", "Node.js", "Three.js"],
    facts: [
      { label: "Rig", value: "R6" },
      { label: "Mesh gốc", value: "Đầu trứng, Trilby, khăn, đai" },
      { label: "GLB sau nén", value: "≈255 KB" },
    ],
    sections: [
      {
        title: "Lấy dữ liệu từ Studio",
        paragraphs: [
          "Vị trí và kích thước từng part, cùng scale của các SpecialMesh, được dump từ model R6 trong Studio thành JSON (tương đối HumanoidRootPart).",
          "Mesh công khai tải từ assetdelivery; mesh bị khoá cần đăng nhập thì lấy từ cache nội dung mà Studio đã tải khi hiển thị model. Texture trong cache ở dạng KTX2 nén BC1 + Zstandard, nên tôi viết bộ giải mã nhỏ để xuất PNG.",
        ],
      },
      {
        title: "Giải mã mesh Roblox",
        paragraphs: [
          "Một script Node đọc định dạng .mesh từ phiên bản 2 đến 7. Bản 7 dùng chunk COREMESH nén Draco, giải bằng draco3d; LOD đầu tiên được giữ lại.",
        ],
      },
      {
        title: "Blender: chỉ nâng chất lượng",
        paragraphs: [
          "Thân và tay chân là khối R6 bo cạnh nhẹ; phụ kiện gắn vào đúng part R6 mà chúng đeo và gán vật liệu PBR — hình dạng gốc không đổi. Mesh bản 7 nén Draco không có thuộc tính NORMAL chuẩn: Roblox cất normal (và tangent) trong các thuộc tính GENERIC. Đọc đúng normal gốc đó thay vì tự dựng lại theo góc giúp khăn choàng và thắt lưng mượt như trong Studio; khăn và thắt lưng cũng chỉ render một mặt giống Roblox.",
          "Cái đầu trứng mắt “sus” không phải là đầu: đó là một accessory gồm hai lớp vỏ — quả trứng trắng có khoét lỗ mắt, bọc ngoài là lớp vỏ đen đảo pháp tuyến (inverted hull). Nhờ backface culling, lớp đen chỉ lộ ra ở viền và qua lỗ mắt. Texture 1-bit nửa đen nửa trắng nên hai lớp được tách theo toạ độ UV.",
          "Cặp kính pixel trên vành mũ không có instance trong model R6 mà đến từ accessory Face trong HumanoidDescription, nên transform của nó được lấy từ bản R15 của cùng avatar.",
        ],
      },
      {
        title: "Lên web",
        paragraphs: [
          "GLB được nén meshopt + WebP. Trên web, rig R6 tái tạo chuỗi Part0 × C0 × Transform × C1⁻¹ của Motor6D, nên các KeyframeSequence gốc phát đúng như trong Roblox.",
        ],
      },
    ],
  },
  "animation-r6-len-web": {
    intro:
      "Gói Ultimate R6 Movement System (tác giả Arczi) có sẵn 15 animation R6 dạng KeyframeSequence. Tôi muốn dùng chúng trên web mà không cần mở Roblox Studio.",
    stack: ["TypeScript", "Node.js", "Three.js", "Vitest"],
    facts: [
      { label: "Clip trích được", value: "15" },
      { label: "Keyframe", value: "853" },
      { label: "Pose", value: "5.619" },
    ],
    sections: [
      {
        title: "Đọc file .rbxm",
        paragraphs: [
          "File .rbxm là định dạng nhị phân gồm các chunk INST, PROP và PRNT, phần lớn nén LZ4. Parser tự viết giải nén LZ4, đọc các kiểu dữ liệu xen kẽ byte (int, float xoay bit, enum, referent) và CFrame, rồi dựng lại cây instance.",
        ],
      },
      {
        title: "Từ KeyframeSequence đến AnimationClip",
        paragraphs: [
          "Mỗi Pose được đổi CFrame sang vị trí + quaternion và xuất JSON theo clip. Trên web, các clip trở thành AnimationClip của Three.js gắn vào node Transform của từng Motor6D; tư thế ngồi không có trong gói nên được tạo riêng bằng code.",
          "Dữ liệu được đối chiếu với giá trị Studio trả về cho cùng keyframe, và bộ test so sánh lại toàn bộ 15 clip với file gốc để tránh hồi quy.",
        ],
      },
      {
        title: "Đồng bộ với âm thanh",
        paragraphs: [
          "Từ góc xoay của hai chân trong clip “run v4”, thời điểm chạm đất được xác định quanh 0,00s và 0,31s của chu kỳ 0,63s; tiếng bước chân Web Audio phát đúng hai mốc đó.",
        ],
      },
    ],
  },
};
