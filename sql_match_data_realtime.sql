-- Bật Realtime cho bảng match_data để /match-now tự động phát hiện khi match data thay đổi
-- Chạy lệnh này trên Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE match_data;
