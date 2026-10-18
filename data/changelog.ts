/** Public changelog: the site is meant to keep evolving, newest release first. */
export type Release = {
  version: string;
  date: string;
  title: string;
  notes: string[];
};

export const changelog: Release[] = [
  {
    version: "4.3",
    date: "2026-10-18",
    title: "EasyVFX và nhạc nền",
    notes: [
      "Màn hình dự án đầu tiên giờ là EasyVFX, plugin VFX không cần code cho Roblox Studio, có ảnh chụp thật trong Studio và link GitHub.",
      "Nút âm thanh phát hai đoạn nhạc làm trong FL Studio: vòng arpeggio công nghệ trong studio, chuyển dần sang pad đồng quê có tiếng gió khi Sussy ra đường. Tiếng bước chân đã bỏ.",
      "Sussy chỉ nhảy khi được bấm chuột, không còn tự nhảy khi qua chương.",
      "Bỏ nút giảm chuyển động. Trang mở bằng tiếng Anh trước, nút VI vẫn chuyển sang tiếng Việt.",
      "Bỏ Aseprite khỏi tech stack.",
    ],
  },
  {
    version: "4.2",
    date: "2026-10-13",
    title: "Đồ nghề thật",
    notes: [
      "Logo tech stack dùng đúng màu của bản gốc: Python xanh vàng, chữ TS trắng trên nền xanh, Luau và roblox-ts có logo riêng, Aseprite dựng từ pixel art 16×16 của app.",
      "Logo nổi cao hơn bệ xám ít nhất 0,16 stud, kể cả khi đang được chọn, nên không còn cắm xuống bệ.",
      "Các khối lơ lửng ở đầu trang đổi thành búa nhổ đinh, búa tạ, cờ lê và tua vít dựng trong Blender. Giữ lại hai viên gạch có stud thật. Trên điện thoại chỉ còn hai món nhỏ cạnh tiêu đề.",
      "Nếu trình duyệt mất WebGL giữa chừng, cảnh tự dựng lại khi có lại, quá 4 giây thì hiện ảnh tĩnh. Loading tự mở sau 15 giây khi mạng chậm.",
      "Bong bóng chat không còn bắt trình duyệt tính lại layout mỗi khung hình.",
    ],
  },
  {
    version: "4.1",
    date: "2026-10-11",
    title: "Màn hình lớn, đường dài hơn",
    notes: [
      "Màn hình demo rộng 14 stud, gần gấp rưỡi bản trước, và các màn hình cách nhau 26 stud nên giữa hai dự án có một quãng đường trống rõ ràng.",
      "Đoạn demo dài 3300 px. Chạy hết cỡ mất khoảng 3,5 giây, cuộn chậm thì Sussy đi bộ.",
      "Panel thông tin dự án trượt vào từ bên trái khi Sussy tới màn hình đầu tiên và trượt ra sau màn hình cuối. Nội dung mỗi dự án cũng lướt vào từ trái.",
      "Trên điện thoại, camera lệch về phía màn hình để thấy được cả màn hình lẫn Sussy.",
    ],
  },
  {
    version: "4.0",
    date: "2026-10-11",
    title: "Một portfolio, một con đường",
    notes: [
      "Gộp hai portfolio Dev và Roblox làm một, với vai trò Roblox Developer. Link /roblox cũ tự chuyển về trang chủ.",
      "Ra khỏi cửa, Sussy có một quãng đường trống rồi mới tới dự án đầu tiên, nên màn hình đầu không còn dính ánh sáng ở cửa.",
      "Dự án chiếu trên những chiếc TV lớn bên đường, mỗi cái cách nhau 18 stud. Panel bên trái đổi nội dung khi Sussy tới TV kế tiếp.",
      "Đoạn demo dài 2700 px. Cuộn chậm thì Sussy đi bộ, cuộn nhanh thì chạy, và chạy hết cỡ mất khoảng 3 giây.",
      "Màn hình loading nằm ở góc phải dưới: đầu Sussy tròn lăn trên một hàng stud, stud sáng lên theo tiến độ. Loading giữ ít nhất 3,5 giây.",
      "Cỏ dày hơn nhiều: bụi cỏ 24 lá, thêm một lớp cỏ thấp phủ mặt đất, đất có vệt màu cỏ. Tán cây có thêm lá nhỏ, phía xa có thêm hai cây.",
    ],
  },
  {
    version: "3.1",
    date: "2026-10-11",
    title: "Bước qua ánh sáng",
    notes: [
      "Khi Sussy tới cửa studio, ánh sáng trong khung cửa tràn kín màn hình, studio đổi sang đồng cỏ ở phía sau lớp sáng, rồi sáng tan dần. Không còn cảnh cỏ trồi lên từ dưới sàn.",
      "Màn hình demo bên đường to hơn khoảng 1,5 lần và đứng trên hai cột.",
      "Tech stack chia ba nhóm Ngôn ngữ, Framework và Công cụ, cả ở hàng chip lẫn trên băng chuyền 3D.",
      "Khăn choàng và thắt lưng trước đây trông như hai lớp chồng nhau, vì mesh Roblox có nhiều mức LOD và tất cả đều bị vẽ ra. Giờ chỉ giữ mức chi tiết nhất.",
    ],
  },
  {
    version: "3.0",
    date: "2026-10-11",
    title: "Khăn gốc, trứng lăn",
    notes: [
      "Khăn choàng dùng lại đúng món Ryuma Black Neck Scarf trong Roblox Studio, với mesh, texture và normal gốc.",
      "Màn hình loading là đầu trứng của Sussy, không mũ không kính, lăn qua lại trên mặt đất.",
      "Favicon là đầu Sussy đội mũ đeo kính, tức icon loading cũ.",
    ],
  },
  {
    version: "2.9",
    date: "2026-10-11",
    title: "Màn hình neon bên đường",
    notes: [
      "Mỗi trạm dừng có một màn hình kiểu cyberpunk chiếu khung hình demo của dự án. Màn hình tự bật khi Sussy tới gần. Dự án chưa có demo thì hiện DEMO // COMING SOON.",
      "Sửa lỗi đầu Sussy thỉnh thoảng xoay tít như chong chóng.",
      "Băng chuyền tech nằm cao hơn một chút, trạm cuối cách gốc cây xa hơn.",
    ],
  },
  {
    version: "2.8",
    date: "2026-10-11",
    title: "Emote wave thật, đi rồi mới chạy",
    notes: [
      "Lời chào là emote wave R6 của chính Roblox (rbxassetid://128777973), lấy từ Roblox Studio. Lúc ngồi thì chỉ tay phải vẫy.",
      "Cuộn chậm thì Sussy đi bộ, cuộn nhanh thì chạy, dừng cuộn thì chậm dần rồi đứng yên.",
      "Sussy quay đầu nhìn tech đang chọn trên băng chuyền, hoặc biển dự án phía trước.",
      "Sửa lỗi trang bị hỏng khi đổi sang tab Roblox lúc đang ở trạm cuối.",
    ],
  },
  {
    version: "2.7",
    date: "2026-10-11",
    title: "Chào kiểu Roblox",
    notes: [
      "Ở màn đầu, Sussy dừng lại, quay về phía bạn và vẫy tay rồi mới chạy tiếp.",
      "Không cuộn trang thì Sussy đứng yên thở nhẹ. Riêng màn mở đầu thì Sussy vẫn chạy.",
      "Băng chuyền tech lùi ra trước và thấp xuống nên không chạm vào Sussy. Logo dùng đúng màu thương hiệu.",
      "Khăn và thắt lưng dùng normal gốc của Roblox (nằm trong thuộc tính GENERIC của mesh Draco), nên mặt vải mượt như trong Studio.",
    ],
  },
  {
    version: "2.6",
    date: "2026-10-11",
    title: "Vẫy tay và ngồi thư thả",
    notes: [
      "Làm lại cú vẫy tay để tay không còn quét ngang mặt.",
      "Tư thế ngồi cuối: lưng hơi ngả, tay để trên đùi, đầu quay lại nhìn bạn và thỉnh thoảng nhìn ra xa.",
      "Chữ mờ dần trước khi trượt xuống dưới header hoặc footer. Bong bóng chat tự ẩn khi bị nội dung che.",
      "Lời tạm biệt chỉ xuất hiện khi Sussy đã ngồi xuống. Nút Liên hệ và phím J đưa thẳng tới cảnh ngồi.",
    ],
  },
  {
    version: "2.5",
    date: "2026-10-11",
    title: "Gió chiều",
    notes: [
      "Lá rơi từ tán cây và một đàn chim bay ngang trời lúc hoàng hôn. Mỗi thứ chỉ tốn một draw call.",
      "Bờ cỏ phía camera thấp hơn để luôn thấy Sussy trên đường.",
    ],
  },
  {
    version: "2.4",
    date: "2026-10-11",
    title: "Hành trình ra hoàng hôn",
    notes: [
      "Hết băng chuyền tech, Sussy chạy qua một cánh cửa sáng, theo con đường đất ngang các cột mốc dự án, tới gốc cây lúc hoàng hôn.",
      "Cây, bụi, cỏ và dương xỉ được dựng lại trong Blender. Cỏ và dương xỉ đung đưa theo gió.",
      "Ở cuối, Sussy ngồi quay mặt ra màn hình, cây ở một bên, mặt trời lặn ở bên kia.",
    ],
  },
  {
    version: "2.3",
    date: "2026-10-11",
    title: "Đúng mặt Sussy",
    notes: [
      "Đầu Sussy giống trong Roblox Studio: quả trứng trắng viền đen, hai mắt oval, thay cho khuôn mặt vẽ tay trước đây.",
    ],
  },
  {
    version: "2.2",
    date: "2026-10-11",
    title: "CI",
    notes: [
      "Mỗi lần đẩy code lên GitHub, CI chạy lint, kiểm tra kiểu, test và build.",
    ],
  },
  {
    version: "2.1",
    date: "2026-10-11",
    title: "Kiểm thử trên trình duyệt",
    notes: [
      "Thêm bộ test Playwright chạy trên Chrome cho cả desktop và mobile.",
    ],
  },
  {
    version: "2.0",
    date: "2026-10-11",
    title: "CV một trang",
    notes: [
      "Trang /cv lấy nội dung từ portfolio, có nút In / Lưu PDF và bản in A4 đen trắng.",
    ],
  },
  {
    version: "1.9",
    date: "2026-10-11",
    title: "Vẫy tay",
    notes: [
      "Sussy vẫy tay khi bạn mới vào trang và khi ngồi ngắm hoàng hôn.",
    ],
  },
  {
    version: "1.8",
    date: "2026-10-11",
    title: "Cột mốc bên đường",
    notes: [
      "Ở chương Dự án, mỗi dự án có một biển báo bên đường, và Sussy đi ngang đúng biển của dự án bạn đang đọc.",
    ],
  },
  {
    version: "1.7",
    date: "2026-10-11",
    title: "Phím tắt và chạm",
    notes: [
      "J / K để chuyển chương, H để Sussy nhảy.",
      "Trên điện thoại, chạm vào Sussy cũng làm Sussy nhảy.",
    ],
  },
  {
    version: "1.6",
    date: "2026-10-11",
    title: "Sussy biết nói",
    notes: [
      "Mỗi khi sang chương mới, trên đầu Sussy hiện một bong bóng chat kiểu Roblox.",
    ],
  },
  {
    version: "1.5",
    date: "2026-10-11",
    title: "Ảnh chia sẻ",
    notes: [
      "Thêm ảnh 1200×630 hiện ra khi chia sẻ link lên Facebook, LinkedIn hay Discord.",
    ],
  },
  {
    version: "1.4",
    date: "2026-10-11",
    title: "Nhẹ hơn",
    notes: [
      "Ảnh trên màn hình chờ đổi sang WebP 5 KB và nằm luôn trong HTML. Ảnh poster dự phòng còn 14 KB.",
      "Model 3D tải với độ ưu tiên thấp. Sửa lỗi console khi prefetch link.",
      "Lighthouse bản production: desktop 99, mobile 86 đến 89. Accessibility, Best Practices và SEO đều 100.",
    ],
  },
  {
    version: "1.3",
    date: "2026-10-11",
    title: "Chạng vạng",
    notes: [
      "Ngồi lại đủ lâu ở phần liên hệ thì trời tối dần và sao bắt đầu hiện. Cuộn đi chỗ khác thì trời sáng lại.",
    ],
  },
  {
    version: "1.2",
    date: "2026-10-11",
    title: "Hello, world",
    notes: [
      "Nút VI / EN trong header chuyển giao diện sang tiếng Anh. Case study và nhật ký vẫn bằng tiếng Việt.",
    ],
  },
  {
    version: "1.1",
    date: "2026-10-11",
    title: "Trang lạc đường",
    notes: [
      "Có trang 404 riêng, kèm đường quay về portfolio và nhật ký.",
    ],
  },
  {
    version: "1.0",
    date: "2026-10-11",
    title: "Case study",
    notes: [
      "Trang /du-an/[slug] cho từng dự án, mở đầu bằng ba case study: Portfolio 3D này, Sussy và Animation R6 lên web.",
    ],
  },
  {
    version: "0.9",
    date: "2026-10-11",
    title: "Baseplate",
    notes: [
      "Studio có một SpawnLocation sau lưng Sussy và vài khối part có stud lơ lửng ở xa.",
      "Bảng leaderstats: Stage theo chương, Studs đếm quãng đường Sussy đã chạy.",
    ],
  },
  {
    version: "0.8",
    date: "2026-10-11",
    title: "Tiếng bước chân",
    notes: [
      "Nút âm thanh trong header, mặc định tắt. Tiếng bước chân được tạo bằng Web Audio và khớp nhịp clip chạy.",
      "Trên sàn studio tiếng chân nghe cứng, trên cỏ thì nghe mềm.",
    ],
  },
  {
    version: "0.7",
    date: "2026-10-11",
    title: "Đổi chế độ không tải lại",
    notes: [
      "Đổi giữa hai portfolio vẫn giữ chương đang xem, không tải lại nhân vật hay renderer.",
      "Thêm 49 test tự động cho phần tính toán cuộn trang, rig R6 và bộ trích animation .rbxm.",
    ],
  },
  {
    version: "0.6",
    date: "2026-10-11",
    title: "Sussy R6 và nhật ký",
    notes: [
      "Nhân vật chuyển sang model R6 Sussy từ Roblox Studio, đủ mũ Trilby, kính pixel, khăn và thắt lưng.",
      "Bấm vào Sussy để nhảy.",
      "Có trang nhật ký này để ghi lại mỗi lần cập nhật.",
    ],
  },
  {
    version: "0.5",
    date: "2026-10-11",
    title: "Hai portfolio",
    notes: [
      "Tách thành portfolio Dev (/) và Roblox (/roblox), đổi qua lại bằng công tắc giữa header.",
      "Bản Roblox có baseplate ban đêm, vòng focus màu xanh, và Sussy nhảy khi sang chương mới.",
    ],
  },
  {
    version: "0.4",
    date: "2026-10-11",
    title: "Chạy theo nhịp cuộn",
    notes: [
      "Animation lấy thẳng từ gói Ultimate R6 Movement System (.rbxm).",
      "Băng chuyền tech stack 3D dưới chân Sussy.",
      "Cảnh hoàng hôn: Sussy ngồi dưới gốc cây cạnh bảng liên hệ.",
    ],
  },
  {
    version: "0.2",
    date: "2026-09-06",
    title: "Sân khấu 3D",
    notes: [
      "Thêm một khung cảnh 3D ở phần mở đầu.",
    ],
  },
  {
    version: "0.1",
    date: "2026-09-06",
    title: "Khởi đầu",
    notes: [
      "Bản đầu tiên: một trang có giới thiệu, dự án, kinh nghiệm và liên hệ.",
    ],
  },
];

export const currentVersion = changelog[0].version;
