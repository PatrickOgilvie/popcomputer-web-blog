-- A post's writer is its blog's writer, whatever writes the row: the editor's
-- binding finds a post by user_id, and readers find it under its blog.
CREATE TRIGGER posts_blog_owner_insert
BEFORE INSERT ON posts
WHEN NEW.user_id IS NOT (SELECT user_id FROM blogs WHERE id = NEW.blog_id)
BEGIN
  SELECT RAISE(ABORT, 'posts_blog_owner');
END;
--> statement-breakpoint
CREATE TRIGGER posts_blog_owner_update
BEFORE UPDATE OF blog_id, user_id ON posts
WHEN NEW.user_id IS NOT (SELECT user_id FROM blogs WHERE id = NEW.blog_id)
BEGIN
  SELECT RAISE(ABORT, 'posts_blog_owner');
END;
