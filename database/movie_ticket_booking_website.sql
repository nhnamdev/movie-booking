
CREATE DATABASE movie_ticket_booking_website;

CREATE TABLE `features` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) DEFAULT NULL,
  `description` VARCHAR(1000) DEFAULT NULL,
  `image_path` VARCHAR(100) DEFAULT NULL,
  `theatre_id` INT(11) NOT NULL,
  PRIMARY KEY (`id`)
  -- , FOREIGN KEY (`theatre_id`) REFERENCES theatres(id) -- Bỏ comment nếu bạn có bảng `theatres`
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `features` (`id`, `title`, `description`, `image_path`, `theatre_id`) VALUES
(1, 'Trải Nghiệm Điện Ảnh Đỉnh Cao', 'Đắm chìm trong hình ảnh sắc nét và âm thanh sống động với công nghệ IMAX hiện đại tại CGV. Màn hình siêu rộng cùng chất lượng trình chiếu đỉnh cao mang đến cảm giác như đang ở giữa những cảnh quay mãn nhãn.', '/Images/features/imax.webp', 1),

(2, 'Âm Thanh Dolby Atmos Đỉnh Cao', 'Cảm nhận âm thanh như thật với công nghệ Dolby Atmos – nơi âm thanh chuyển động khắp không gian, đưa bạn vào trung tâm câu chuyện với từng chi tiết sống động, chân thật đến khó tin.', '/Images/features/sound.webp', 1),

(3, 'Ẩm Thực Hấp Dẫn', 'Không chỉ xem phim, bạn còn được thưởng thức các món ăn hấp dẫn tại CGV: bắp rang bơ nóng hổi, nachos phô mai béo ngậy, xúc xích kiểu Âu và các loại nước giải khát phong phú. Một bữa tiệc điện ảnh hoàn hảo!', '/Images/features/food.webp', 1),

(4, 'Không Gian Sang Trọng', 'Trước và sau buổi chiếu, hãy thư giãn tại khu lounge cao cấp của CGV với ghế ngồi êm ái, thiết kế hiện đại và không gian riêng tư – sẵn sàng mang đến trải nghiệm điện ảnh đẳng cấp.', '/Images/features/lounge.webp', 1),

(6, 'Trải Nghiệm Điện Ảnh Đỉnh Cao', 'Đắm chìm trong hình ảnh sắc nét và âm thanh sống động với công nghệ IMAX hiện đại tại CGV. Màn hình siêu rộng cùng chất lượng trình chiếu đỉnh cao mang đến cảm giác như đang ở giữa những cảnh quay mãn nhãn.', '/Images/features/imax.webp', 2),

(7, 'Âm Thanh Dolby Atmos Đỉnh Cao', 'Cảm nhận âm thanh như thật với công nghệ Dolby Atmos – nơi âm thanh chuyển động khắp không gian, đưa bạn vào trung tâm câu chuyện với từng chi tiết sống động, chân thật đến khó tin.', '/Images/features/sound.webp', 2),

(8, 'Ẩm Thực Hấp Dẫn', 'Không chỉ xem phim, bạn còn được thưởng thức các món ăn hấp dẫn tại CGV: bắp rang bơ nóng hổi, nachos phô mai béo ngậy, xúc xích kiểu Âu và các loại nước giải khát phong phú. Một bữa tiệc điện ảnh hoàn hảo!', '/Images/features/food.webp', 2),

(9, 'Không Gian Sang Trọng', 'Trước và sau buổi chiếu, hãy thư giãn tại khu lounge cao cấp của CGV với ghế ngồi êm ái, thiết kế hiện đại và không gian riêng tư – sẵn sàng mang đến trải nghiệm điện ảnh đẳng cấp.', '/Images/features/lounge.webp', 2);

CREATE TABLE `hall` (
  `id` int(11) NOT NULL,
  `name` varchar(10) DEFAULT NULL,
  `total_seats` int(11) DEFAULT NULL,
  `theatre_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `hall` (`id`, `name`, `total_seats`, `theatre_id`) VALUES
(1, 'Phòng 1', 48, 1),
(2, 'Phòng 2', 48, 1),
(3, 'Phòng 3', 48, 1),
(4, 'Phòng 4', 48, 1),
(5, 'Phòng 1', 48, 2),
(6, 'Phòng 2', 48, 2),
(7, 'Phòng 3', 48, 2),
(8, 'Phòng 4', 48, 2);

CREATE TABLE `hallwise_seat` (
  `hall_id` int(11) NOT NULL,
  `seat_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `hallwise_seat` (`hall_id`, `seat_id`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7),
(1, 8),
(1, 9),
(1, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 15),
(1, 16),
(1, 17),
(1, 18),
(1, 19),
(1, 20),
(1, 21),
(1, 22),
(1, 23),
(1, 24),
(1, 25),
(1, 26),
(1, 27),
(1, 28),
(1, 29),
(1, 30),
(1, 31),
(1, 32),
(1, 33),
(1, 34),
(1, 35),
(1, 36),
(1, 37),
(1, 38),
(1, 39),
(1, 40),
(1, 41),
(1, 42),
(1, 43),
(1, 44),
(1, 45),
(1, 46),
(1, 47),
(1, 48),
(2, 1),
(2, 2),
(2, 3),
(2, 4),
(2, 5),
(2, 6),
(2, 7),
(2, 8),
(2, 9),
(2, 10),
(2, 11),
(2, 12),
(2, 13),
(2, 14),
(2, 15),
(2, 16),
(2, 17),
(2, 18),
(2, 19),
(2, 20),
(2, 21),
(2, 22),
(2, 23),
(2, 24),
(2, 25),
(2, 26),
(2, 27),
(2, 28),
(2, 29),
(2, 30),
(2, 31),
(2, 32),
(2, 33),
(2, 34),
(2, 35),
(2, 36),
(2, 37),
(2, 38),
(2, 39),
(2, 40),
(2, 41),
(2, 42),
(2, 43),
(2, 44),
(2, 45),
(2, 46),
(2, 47),
(2, 48),
(3, 1),
(3, 2),
(3, 3),
(3, 4),
(3, 5),
(3, 6),
(3, 7),
(3, 8),
(3, 9),
(3, 10),
(3, 11),
(3, 12),
(3, 13),
(3, 14),
(3, 15),
(3, 16),
(3, 17),
(3, 18),
(3, 19),
(3, 20),
(3, 21),
(3, 22),
(3, 23),
(3, 24),
(3, 25),
(3, 26),
(3, 27),
(3, 28),
(3, 29),
(3, 30),
(3, 31),
(3, 32),
(3, 33),
(3, 34),
(3, 35),
(3, 36),
(3, 37),
(3, 38),
(3, 39),
(3, 40),
(3, 41),
(3, 42),
(3, 43),
(3, 44),
(3, 45),
(3, 46),
(3, 47),
(3, 48),
(4, 1),
(4, 2),
(4, 3),
(4, 4),
(4, 5),
(4, 6),
(4, 7),
(4, 8),
(4, 9),
(4, 10),
(4, 11),
(4, 12),
(4, 13),
(4, 14),
(4, 15),
(4, 16),
(4, 17),
(4, 18),
(4, 19),
(4, 20),
(4, 21),
(4, 22),
(4, 23),
(4, 24),
(4, 25),
(4, 26),
(4, 27),
(4, 28),
(4, 29),
(4, 30),
(4, 31),
(4, 32),
(4, 33),
(4, 34),
(4, 35),
(4, 36),
(4, 37),
(4, 38),
(4, 39),
(4, 40),
(4, 41),
(4, 42),
(4, 43),
(4, 44),
(4, 45),
(4, 46),
(4, 47),
(4, 48),
(5, 1),
(5, 2),
(5, 3),
(5, 4),
(5, 5),
(5, 6),
(5, 7),
(5, 8),
(5, 9),
(5, 10),
(5, 11),
(5, 12),
(5, 13),
(5, 14),
(5, 15),
(5, 16),
(5, 17),
(5, 18),
(5, 19),
(5, 20),
(5, 21),
(5, 22),
(5, 23),
(5, 24),
(5, 25),
(5, 26),
(5, 27),
(5, 28),
(5, 29),
(5, 30),
(5, 31),
(5, 32),
(5, 33),
(5, 34),
(5, 35),
(5, 36),
(5, 37),
(5, 38),
(5, 39),
(5, 40),
(5, 41),
(5, 42),
(5, 43),
(5, 44),
(5, 45),
(5, 46),
(5, 47),
(5, 48),
(6, 1),
(6, 2),
(6, 3),
(6, 4),
(6, 5),
(6, 6),
(6, 7),
(6, 8),
(6, 9),
(6, 10),
(6, 11),
(6, 12),
(6, 13),
(6, 14),
(6, 15),
(6, 16),
(6, 17),
(6, 18),
(6, 19),
(6, 20),
(6, 21),
(6, 22),
(6, 23),
(6, 24),
(6, 25),
(6, 26),
(6, 27),
(6, 28),
(6, 29),
(6, 30),
(6, 31),
(6, 32),
(6, 33),
(6, 34),
(6, 35),
(6, 36),
(6, 37),
(6, 38),
(6, 39),
(6, 40),
(6, 41),
(6, 42),
(6, 43),
(6, 44),
(6, 45),
(6, 46),
(6, 47),
(6, 48),
(7, 1),
(7, 2),
(7, 3),
(7, 4),
(7, 5),
(7, 6),
(7, 7),
(7, 8),
(7, 9),
(7, 10),
(7, 11),
(7, 12),
(7, 13),
(7, 14),
(7, 15),
(7, 16),
(7, 17),
(7, 18),
(7, 19),
(7, 20),
(7, 21),
(7, 22),
(7, 23),
(7, 24),
(7, 25),
(7, 26),
(7, 27),
(7, 28),
(7, 29),
(7, 30),
(7, 31),
(7, 32),
(7, 33),
(7, 34),
(7, 35),
(7, 36),
(7, 37),
(7, 38),
(7, 39),
(7, 40),
(7, 41),
(7, 42),
(7, 43),
(7, 44),
(7, 45),
(7, 46),
(7, 47),
(7, 48),
(8, 1),
(8, 2),
(8, 3),
(8, 4),
(8, 5),
(8, 6),
(8, 7),
(8, 8),
(8, 9),
(8, 10),
(8, 11),
(8, 12),
(8, 13),
(8, 14),
(8, 15),
(8, 16),
(8, 17),
(8, 18),
(8, 19),
(8, 20),
(8, 21),
(8, 22),
(8, 23),
(8, 24),
(8, 25),
(8, 26),
(8, 27),
(8, 28),
(8, 29),
(8, 30),
(8, 31),
(8, 32),
(8, 33),
(8, 34),
(8, 35),
(8, 36),
(8, 37),
(8, 38),
(8, 39),
(8, 40),
(8, 41),
(8, 42),
(8, 43),
(8, 44),
(8, 45),
(8, 46),
(8, 47),
(8, 48);


CREATE TABLE `movie` (
  `id` int(11) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `image_path` varchar(150) DEFAULT NULL,
  `language` varchar(15) DEFAULT NULL,
  `synopsis` varchar(500) DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT NULL,
  `duration` varchar(10) DEFAULT NULL,
  `audio_type` varchar(30) DEFAULT 'Phụ Đề',
  `age_rating` varchar(160) DEFAULT 'P: Phim dành cho khán giả mọi lứa tuổi',
  `top_cast` varchar(30) DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `movie` (`id`, `name`, `image_path`, `language`, `synopsis`, `rating`, `duration`, `audio_type`, `age_rating`, `top_cast`, `release_date`, `end_date`) VALUES
(1, 'Người Nhện: Du Hành Vũ Trụ Nhện', '/media/movies/spiderman.webp', 'Hoa Kỳ', 'Miles Morales bước vào thế giới Đa Vũ Trụ và đối mặt với hàng loạt Người Nhện khác nhau. Khi xảy ra mâu thuẫn về cách xử lý hiểm họa mới, Miles phải học cách trở thành một người hùng theo cách riêng của mình.', 8.8, '136', 'Phụ Đề', 'T13: Phim dành cho khán giả từ đủ 13 tuổi trở lên (13+)', 'Quang Tuấn', '2026-05-28', '2026-06-27'),
(2, 'Cuộc Giải Cứu 2', '/media/movies/extraction2.webp', 'Hoa Kỳ', 'Tyler Rake quay trở lại sau khi sống sót sau nhiệm vụ sinh tử tại Dhaka. Anh và đồng đội tiếp tục lao vào một nhiệm vụ giải cứu đầy kịch tính và nguy hiểm mới.', 7.0, '123', 'Phụ Đề', 'T16: Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)', 'Kiều Minh Tuấn', '2026-05-28', '2026-06-27'),
(3, 'Vụ Án Bí Ẩn 2', '/media/movies/murderMystery.webp', 'Hoa Kỳ', 'Hai thám tử nghiệp dư Nick và Audrey bất ngờ bị cuốn vào vụ bắt cóc quy mô quốc tế tại lễ cưới xa hoa của bạn họ - Maharaja. Liệu họ có thể phá án lần nữa?', 5.7, '90', 'Lồng Tiếng', 'K: Phim dành cho khán giả dưới 13 tuổi xem cùng cha, mẹ hoặc người giám hộ', 'Thu Trang', '2026-05-29', '2026-06-28'),
(4, 'Nhiệm Vụ Bất Khả Thi: Phần 1', '/media/movies/missionImpossible.webp', 'Hoa Kỳ', 'Ethan Hunt và đội IMF phải ngăn chặn một vũ khí cực kỳ nguy hiểm trước khi nó rơi vào tay kẻ xấu. Cuộc đua nghẹt thở toàn cầu bắt đầu, đẩy Ethan đối mặt với thử thách lớn nhất trong sự nghiệp.', 8.0, '163', 'Phụ Đề', 'T16: Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)', 'Ngô Thanh Vân', '2026-05-29', '2026-06-28'),
(5, 'Oppenheimer', '/media/movies/oppenheimer.webp', 'Hoa Kỳ', 'Lấy bối cảnh Thế chiến II, nhà khoa học J. Robert Oppenheimer dẫn đầu Dự án Manhattan chế tạo bom nguyên tử. Bộ phim tái hiện cuộc đời và quyết định thay đổi lịch sử nhân loại của ông.', 9.4, '180', 'Phụ Đề', 'T18: Phim dành cho khán giả từ đủ 18 tuổi trở lên (18+)', 'Trấn Thành', '2026-05-30', '2026-06-29'),
(6, 'Barbie: Thế Giới Thực', '/media/movies/barbie.webp', 'Hoa Kỳ', 'Barbie và Ken rời khỏi vùng đất mộng mơ để khám phá thế giới thực. Những điều kỳ diệu và rắc rối xảy đến khi họ phải đối mặt với thực tế phức tạp của con người.', 7.6, '114', 'Lồng Tiếng', 'P: Phim dành cho khán giả mọi lứa tuổi', 'Kaity Nguyễn', '2026-05-30', '2026-06-29');


CREATE TABLE `movie_directors` (
  `movie_id` int(11) NOT NULL,
  `director` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `movie_directors` (`movie_id`, `director`) VALUES
(1, 'Nguyễn Quang Dũng'),
(1, 'Phan Gia Nhật Linh'),
(1, 'Victor Vũ'),
(2, 'Lý Hải'),
(3, 'Nhất Trung'),
(4, 'Charlie Nguyễn'),
(5, 'Đinh Hà Uyên Thư'),
(6, 'Vũ Ngọc Đãng');

CREATE TABLE `movie_genre` (
  `movie_id` int(11) NOT NULL,
  `genre` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `movie_genre` (`movie_id`, `genre`) VALUES
(1, 'Hành động'),
(1, 'Phiêu lưu'),
(1, 'Hoạt hình'),
(2, 'Hành động'),
(2, 'Giật gân'),
(3, 'Hài hước'),
(3, 'Trinh thám'),
(4, 'Hành động'),
(4, 'Phiêu lưu'),
(4, 'Giật gân'),
(5, 'Tiểu sử'),
(5, 'Chính kịch'),
(5, 'Lịch sử'),
(6, 'Phiêu lưu'),
(6, 'Hài hước'),
(6, 'Kỳ ảo');

CREATE TABLE `payment` (
  `id` int(11) NOT NULL,
  `payment_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `amount` int(11) DEFAULT NULL,
  `method` varchar(30) DEFAULT NULL,
  `customer_email` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `payment` (`id`, `payment_time`, `amount`, `method`, `customer_email`) VALUES
(1, '2023-08-16 19:41:37', 140000, 'Tiền mặt', 'Belal123@gmail.com'),
(2, '2023-08-16 19:43:03', 130000, 'Tiền mặt', 'rahim123@gmail.com'),
(3, '2023-08-20 10:32:06', 130000, 'Tiền mặt', 'neloy.saha456@gmail.com'),
(4, '2023-08-20 10:44:19', 70000, 'Tiền mặt', 'neloy.saha456@gmail.com'),
(5, '2023-08-20 12:24:02', 70000, 'Tiền mặt', 'neloy.saha456@gmail.com'),
(6, '2023-08-20 14:36:08', 270000, 'Tiền mặt', 'sazin@gmail.com'),
(7, '2023-08-20 16:13:23', 70000, 'Tiền mặt', 'neloy.saha456@gmail.com'),
(8, '2023-08-20 17:56:07', 90000, 'Tiền mặt', 'farhan@gmail.com');

CREATE TABLE `person` (
  `email` varchar(100) NOT NULL,
  `first_name` varchar(20) DEFAULT NULL,
  `last_name` varchar(20) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `phone_number` char(10) DEFAULT NULL,
  `account_balance` int(11) DEFAULT NULL,
  `person_type` varchar(8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `person` (`email`, `first_name`, `last_name`, `password`, `phone_number`, `account_balance`, `person_type`) VALUES
('admin@gmail.com', 'Quản trị', 'Viên', 'Admin12345', '0858200725', 100000, 'Admin'),
('nam@gmail.com', 'Nam', 'Nguyễn', 'Namne12345', '0912345678', 100000, 'Customer'),
('Belal123@gmail.com', 'Minh', 'Trần', '123', '0987654321', 1000000, 'Customer'),
('farhan@gmail.com', 'Huy', 'Lê', 'farhan123', '0901234567', 100000, 'Customer'),
('jon@alu.com', 'An', 'Phạm', 'test1', '0934567890', 100000, 'Customer'),
('jon@potato.com', 'Bảo', 'Hoàng', 'test1', '0967890123', 100000, 'Customer'),
('Jon@snow.com', 'Long', 'Đỗ', '456', '0971112233', 10000, 'Customer'),
('neloy.saha456@gmail.com', 'Khánh', 'Vũ', '1234', '0888888888', 100000, 'Customer'),
('niaz@nafi.com', 'Duy', 'Phan', '123', '0866666666', 100000, 'Customer'),
('rahim123@gmail.com', 'Tú', 'Ngô', '123', '0899999999', 100000, 'Customer'),
('sazin@gmail.com', 'Linh', 'Bùi', 'sazin1234', '0323456789', 100000, 'Customer');

CREATE TABLE `seat` (
  `id` int(11) NOT NULL,
  `name` char(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `seat` (`id`, `name`) VALUES
(1, 'A1'),
(2, 'A2'),
(3, 'A3'),
(4, 'A4'),
(5, 'A5'),
(6, 'A6'),
(7, 'A7'),
(8, 'A8'),
(9, 'B1'),
(10, 'B2'),
(11, 'B3'),
(12, 'B4'),
(13, 'B5'),
(14, 'B6'),
(15, 'B7'),
(16, 'B8'),
(17, 'C1'),
(18, 'C2'),
(19, 'C3'),
(20, 'C4'),
(21, 'C5'),
(22, 'C6'),
(23, 'C7'),
(24, 'C8'),
(25, 'D1'),
(26, 'D2'),
(27, 'D3'),
(28, 'D4'),
(29, 'D5'),
(30, 'D6'),
(31, 'D7'),
(32, 'D8'),
(33, 'E1'),
(34, 'E2'),
(35, 'E3'),
(36, 'E4'),
(37, 'E5'),
(38, 'E6'),
(39, 'E7'),
(40, 'E8'),
(41, 'F1'),
(42, 'F2'),
(43, 'F3'),
(44, 'F4'),
(45, 'F5'),
(46, 'F6'),
(47, 'F7'),
(48, 'F8');

CREATE TABLE `shown_in` (
  `movie_id` int(11) NOT NULL,
  `showtime_id` int(11) NOT NULL,
  `hall_id` int(11) NOT NULL,
  `status` varchar(20) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `shown_in` (`movie_id`, `showtime_id`, `hall_id`) VALUES
(1, 1, 1),
(1, 1, 5),
(1, 2, 3),
(1, 2, 7),
(1, 3, 3),
(1, 3, 7),
(1, 4, 1),
(1, 4, 5),
(1, 5, 3),
(1, 5, 7),
(1, 6, 3),
(1, 6, 7),
(1, 7, 1),
(1, 7, 5),
(1, 8, 3),
(1, 8, 7),
(1, 9, 3),
(1, 9, 7),
(1, 10, 1),
(1, 10, 5),
(1, 11, 3),
(1, 11, 7),
(1, 12, 3),
(1, 12, 7),
(2, 2, 4),
(2, 2, 8),
(2, 3, 4),
(2, 3, 8),
(2, 5, 4),
(2, 5, 8),
(2, 6, 4),
(2, 6, 8),
(2, 8, 4),
(2, 8, 8),
(2, 9, 4),
(2, 9, 8),
(2, 11, 4),
(2, 11, 8),
(2, 12, 4),
(2, 12, 8),
(3, 1, 3),
(3, 1, 7),
(3, 4, 3),
(3, 4, 7),
(3, 7, 3),
(3, 7, 7),
(3, 10, 3),
(3, 10, 7),
(4, 1, 4),
(4, 1, 8),
(4, 3, 5),
(4, 4, 4),
(4, 4, 8),
(4, 6, 5),
(4, 7, 4),
(4, 7, 8),
(4, 9, 5),
(4, 10, 4),
(4, 10, 8),
(4, 12, 5),
(5, 1, 2),
(5, 1, 6),
(5, 2, 1),
(5, 2, 5),
(5, 3, 1),
(5, 4, 2),
(5, 4, 6),
(5, 5, 1),
(5, 5, 5),
(5, 6, 1),
(5, 7, 2),
(5, 7, 6),
(5, 8, 1),
(5, 8, 5),
(5, 9, 1),
(5, 10, 2),
(5, 10, 6),
(5, 11, 1),
(5, 11, 5),
(5, 12, 1),
(6, 2, 2),
(6, 2, 6),
(6, 3, 2),
(6, 3, 6),
(6, 5, 2),
(6, 5, 6),
(6, 6, 2),
(6, 6, 6),
(6, 8, 2),
(6, 8, 6),
(6, 9, 2),
(6, 9, 6),
(6, 11, 2),
(6, 11, 6),
(6, 12, 2),
(6, 12, 6);

CREATE TABLE `showtimes` (
  `id` int(11) NOT NULL,
  `movie_start_time` varchar(20) DEFAULT NULL,
  `show_type` char(2) DEFAULT NULL,
  `screen_type` varchar(30) DEFAULT 'Tiêu chuẩn',
  `showtime_date` date DEFAULT NULL,
  `price_per_seat` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `showtimes` (`id`, `movie_start_time`, `show_type`, `screen_type`, `showtime_date`, `price_per_seat`) VALUES
(1, '11:30', '2D', 'Tiêu chuẩn', '2026-05-28', 120000),
(2, '13:00', '2D', 'Tiêu chuẩn', '2026-05-28', 120000),
(3, '15:30', '3D', 'Tiêu chuẩn', '2026-05-28', 150000),
(4, '18:20', '2D', 'Tiêu chuẩn', '2026-05-28', 120000),
(5, '19:45', '3D', 'Cao cấp', '2026-05-29', 180000),
(6, '20:45', '2D', 'Tiêu chuẩn', '2026-05-29', 120000),
(7, '09:10', '2D', 'Tiêu chuẩn', '2026-05-29', 120000),
(8, '11:20', '2D', 'Tiêu chuẩn', '2026-05-29', 120000),
(9, '15:50', '3D', 'Tiêu chuẩn', '2026-05-30', 150000),
(10, '18:40', '2D', 'Tiêu chuẩn', '2026-05-30', 120000),
(11, '21:20', '3D', 'Cao cấp', '2026-05-30', 180000),
(12, '22:45', '3D', 'Tiêu chuẩn', '2026-05-31', 150000);

CREATE TABLE `theatre` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `location` varchar(30) DEFAULT NULL,
  `location_details` varchar(250) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `theatre` (`id`, `name`, `location`, `location_details`) VALUES
(1, 'CGV Aeon Mall Tân Phú', 'Tân Phú', 'Tầng 3, Aeon Mall Tân Phú Celadon, Số 30 Bờ Bao Tân Thắng, P. Sơn Kỳ, Q. Tân Phú, TP. HCM'),
(2, 'CGV Vincom Đồng Khởi', 'Quận 1', 'Tầng 3, Trung tâm thương mại Vincom Đồng Khởi, 72 Lê Thánh Tôn, Q.1, TP. HCM');

CREATE TABLE `ticket` (
  `id` int(11) NOT NULL,
  `price` int(11) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `payment_id` int(11) NOT NULL,
  `seat_id` int(11) NOT NULL,
  `hall_id` int(11) NOT NULL,
  `movie_id` int(11) NOT NULL,
  `showtimes_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `ticket` (`id`, `price`, `purchase_date`, `payment_id`, `seat_id`, `hall_id`, `movie_id`, `showtimes_id`) VALUES
(1, 150000, '2023-08-17', 2, 3, 1, 5, 3),
(2, 150000, '2023-08-17', 2, 4, 1, 5, 3),
(3, 150000, '2023-08-17', 2, 5, 1, 5, 3),
(4, 120000, '2023-08-17', 1, 3, 2, 5, 1),
(5, 120000, '2023-08-17', 1, 4, 2, 5, 1),
(6, 120000, '2023-08-17', 1, 5, 2, 5, 1),
(7, 120000, '2023-08-17', 1, 6, 2, 5, 1),
(8, 150000, '2023-08-20', 3, 19, 2, 6, 2),
(9, 150000, '2023-08-20', 3, 20, 2, 6, 2),
(10, 150000, '2023-08-20', 3, 21, 2, 6, 2),
(11, 120000, '2023-08-20', 4, 5, 3, 3, 7),
(12, 120000, '2023-08-20', 4, 6, 3, 3, 7),
(13, 120000, '2023-08-20', 5, 6, 5, 1, 1),
(14, 120000, '2023-08-20', 5, 5, 5, 1, 1),
(15, 120000, '2023-08-20', 6, 29, 2, 5, 7),
(16, 120000, '2023-08-20', 6, 27, 2, 5, 7),
(17, 120000, '2023-08-20', 6, 30, 2, 5, 7),
(18, 150000, '2023-08-20', 7, 11, 6, 6, 11),
(19, 150000, '2023-08-20', 7, 12, 6, 6, 11),
(20, 150000, '2023-08-20', 8, 11, 5, 5, 5),
(21, 150000, '2023-08-20', 8, 12, 5, 5, 5),
(22, 150000, '2023-08-20', 8, 13, 5, 5, 5),
(23, 150000, '2023-08-20', 8, 14, 5, 5, 5),
(24, 150000, '2023-08-20', 8, 21, 5, 5, 5),
(25, 150000, '2023-08-20', 8, 22, 5, 5, 5);


ALTER TABLE `hall`
  ADD PRIMARY KEY (`id`),
  ADD KEY `theatre_id` (`theatre_id`);


ALTER TABLE `hallwise_seat`
  ADD PRIMARY KEY (`hall_id`,`seat_id`),
  ADD KEY `seat_id` (`seat_id`);


ALTER TABLE `movie`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `movie_directors`
  ADD PRIMARY KEY (`movie_id`,`director`);


ALTER TABLE `movie_genre`
  ADD PRIMARY KEY (`movie_id`,`genre`);


ALTER TABLE `payment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_email` (`customer_email`);


ALTER TABLE `person`
  ADD PRIMARY KEY (`email`);


ALTER TABLE `seat`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `shown_in`
  ADD PRIMARY KEY (`movie_id`,`showtime_id`,`hall_id`),
  ADD KEY `showtime_id` (`showtime_id`),
  ADD KEY `hall_id` (`hall_id`);


ALTER TABLE `showtimes`
  ADD PRIMARY KEY (`id`);


ALTER TABLE `theatre`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `ticket`
  ADD PRIMARY KEY (`id`),
  ADD KEY `showtimes_id` (`showtimes_id`),
  ADD KEY `payment_id` (`payment_id`),
  ADD KEY `seat_id` (`seat_id`),
  ADD KEY `hall_id` (`hall_id`),
  ADD KEY `movie_id` (`movie_id`);

ALTER TABLE `features`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `hall`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

ALTER TABLE `movie`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

ALTER TABLE `payment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

ALTER TABLE `seat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

ALTER TABLE `showtimes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

ALTER TABLE `theatre`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;


ALTER TABLE `ticket`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

ALTER TABLE `features`
  ADD CONSTRAINT `features_ibfk_1` FOREIGN KEY (`theatre_id`) REFERENCES `theatre` (`id`) ON DELETE CASCADE;

ALTER TABLE `hall`
  ADD CONSTRAINT `hall_ibfk_1` FOREIGN KEY (`theatre_id`) REFERENCES `theatre` (`id`) ON DELETE CASCADE;

ALTER TABLE `hallwise_seat`
  ADD CONSTRAINT `hallwise_seat_ibfk_1` FOREIGN KEY (`hall_id`) REFERENCES `hall` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `hallwise_seat_ibfk_2` FOREIGN KEY (`seat_id`) REFERENCES `seat` (`id`) ON DELETE CASCADE;

ALTER TABLE `movie_directors`
  ADD CONSTRAINT `movie_directors_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movie` (`id`) ON DELETE CASCADE;

ALTER TABLE `movie_genre`
  ADD CONSTRAINT `movie_genre_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movie` (`id`) ON DELETE CASCADE;

ALTER TABLE `payment`
  ADD CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`customer_email`) REFERENCES `person` (`email`);

ALTER TABLE `shown_in`
  ADD CONSTRAINT `shown_in_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movie` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `shown_in_ibfk_2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `shown_in_ibfk_3` FOREIGN KEY (`hall_id`) REFERENCES `hall` (`id`) ON DELETE CASCADE;

ALTER TABLE `ticket`
  ADD CONSTRAINT `ticket_ibfk_1` FOREIGN KEY (`showtimes_id`) REFERENCES `showtimes` (`id`),
  ADD CONSTRAINT `ticket_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`),
  ADD CONSTRAINT `ticket_ibfk_3` FOREIGN KEY (`seat_id`) REFERENCES `seat` (`id`),
  ADD CONSTRAINT `ticket_ibfk_4` FOREIGN KEY (`hall_id`) REFERENCES `hall` (`id`),
  ADD CONSTRAINT `ticket_ibfk_5` FOREIGN KEY (`movie_id`) REFERENCES `movie` (`id`);
COMMIT;
