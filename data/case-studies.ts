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
      "Nhân vật Roblox của tôi chạy theo nhịp cuộn trang. Sussy đi qua băng chuyền tech stack, ra khỏi studio, ngang qua các dự án bên đường, rồi ngồi dưới gốc cây lúc hoàng hôn ở phần liên hệ.",
    stack: ["Vinext / Next.js App Router", "React 19", "TypeScript", "Three.js", "Blender", "Vitest"],
    facts: [
      { label: "Model nhân vật", value: "≈162 KB" },
      { label: "Test tự động", value: "71 + e2e" },
      { label: "Đoạn showcase", value: "3300 px" },
    ],
    sections: [
      {
        title: "Bài toán",
        paragraphs: [
          "Tôi muốn trang có nét riêng mà vẫn đọc được như một trang bình thường. Chữ phải hiện ngay, còn 3D nằm phía sau.",
          "Trang có bốn chương, mỗi chương cộng từ 0 đến 1 vào một giá trị “story”. Camera, nhân vật và cảnh vật đều tính từ giá trị này, nên cuộn ngược lại thì mọi thứ chạy ngược y hệt.",
        ],
      },
      {
        title: "Một sân khấu duy nhất",
        paragraphs: [
          "Cả trang dùng một WebGL renderer nằm cố định phía sau HTML. Renderer chỉ được tải sau khi chữ đã hiện. Trước đây trang có hai portfolio Dev và Roblox dùng chung renderer này; giờ hai bản đã gộp thành một portfolio Roblox Developer.",
          "Ánh sáng dùng tone mapping AgX, môi trường PMREM và bóng tiếp xúc giả thay cho shadow map. Độ phân giải tự hạ khi FPS thấp và vòng render dừng hẳn khi tab bị ẩn.",
        ],
      },
      {
        title: "Từ studio ra hoàng hôn",
        paragraphs: [
          "Tech stack diễn ra trong một studio tối, còn phần liên hệ là đồi cỏ lúc hoàng hôn. Phần dự án nối hai cảnh lại. Băng chuyền tắt, một cánh cửa sáng hiện ra, và khi Sussy bước qua thì ánh sáng trong khung cửa phủ kín màn hình. Studio đổi sang đồng cỏ ngay sau lớp sáng đó.",
          "Ra khỏi cửa là một quãng đường trống, sau đó tới bốn màn hình lớn bên đường, mỗi cái chiếu demo của một dự án và cách nhau 26 stud. Panel bên trái trượt vào khi Sussy tới màn hình đầu tiên và đổi nội dung ở mỗi màn hình kế tiếp. Vị trí từng màn hình được đo từ trang HTML, nên màn hình nào cũng hiện đúng lúc panel nói về nó. Cuộn chậm thì Sussy đi bộ, cuộn nhanh thì chạy.",
          "Cây, bụi, cỏ và dương xỉ được dựng bằng script Python trong Blender. Bóng trong tán lá và viền nắng được tính sẵn vào màu đỉnh, nên trên web mỗi loại chỉ cần một vật liệu. Cỏ có hai loại, bụi cao và thảm thấp, tổng cộng khoảng mười nghìn instance trên desktop, đung đưa nhờ một shader gió nhỏ.",
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
          "Trang được làm theo từng phiên bản nhỏ và mỗi bản đều có ghi trong Nhật ký. Phần tính toán cuộn trang, rig R6 và bộ trích animation đều có test tự động, nên sửa lớn cũng ít sợ hỏng.",
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
          "Một script Node đọc định dạng .mesh từ phiên bản 2 đến 7. Bản 7 dùng chunk COREMESH nén Draco, giải bằng draco3d. Tam giác của mọi mức LOD nằm nối tiếp nhau trong COREMESH; chunk LODS cho biết mỗi mức bắt đầu ở đâu, và chỉ LOD0 được giữ lại. Lúc đầu bước này bị bỏ sót, nên các LOD thô vẽ đè lên LOD0 khiến khăn choàng trông như hai cái khăn chồng nhau, lốm đốm z-fighting.",
        ],
      },
      {
        title: "Blender: chỉ nâng chất lượng",
        paragraphs: [
          "Thân và tay chân là khối R6 bo cạnh nhẹ. Phụ kiện được gắn vào đúng part R6 mà chúng đeo, gán vật liệu PBR và giữ nguyên hình dạng gốc. Mesh bản 7 nén Draco không có thuộc tính NORMAL chuẩn: Roblox cất normal (và tangent) trong các thuộc tính GENERIC. Đọc đúng normal gốc đó thay vì tự dựng lại theo góc giúp khăn choàng và thắt lưng mượt như trong Studio; khăn và thắt lưng cũng chỉ render một mặt giống Roblox.",
          "Cái đầu trứng mắt “sus” thật ra không phải là đầu mà là một accessory hai lớp vỏ. Bên trong là quả trứng trắng có khoét lỗ mắt, bên ngoài là lớp vỏ đen đảo pháp tuyến (inverted hull). Nhờ backface culling, lớp đen chỉ lộ ra ở viền và qua lỗ mắt. Texture 1-bit nửa đen nửa trắng nên hai lớp được tách theo toạ độ UV.",
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
        title: "Emote wave của chính Roblox",
        paragraphs: [
          "Lời chào dùng emote wave R6 gốc của Roblox: KeyframeSequence 128777973 được tải trong Studio, xuất ra .rbxm rồi đi qua cùng bộ trích ở trên, nên chuyển động giống hệt khi gõ /e wave trong game. Trên web nó được phát như một track ưu tiên Action, có fade vào/ra 0,15s.",
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
