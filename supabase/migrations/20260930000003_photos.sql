-- 기록 사진 (계정·백업 설계 ③ Storage). 비공개, 본인 폴더({user_id}/)만.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy record_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- 올리기·바꾸기는 {user_id}/{record_id}.jpg 한 단계에만 둔다. 하위 폴더를 허용하면 계정 삭제가 사진 폴더를 비우지 못한다
-- (폴더 목록에 하위 폴더 이름만 나오고, 그 이름을 지워도 안의 파일은 남는다).
create policy record_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'record-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
  );
create policy record_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'record-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
  );
create policy record_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
