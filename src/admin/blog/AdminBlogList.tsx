import { useState } from "react";
import { useBlogList } from "../../api/hooks/useBlogPosts";
import { useDeleteBlogPost } from "../../api/hooks/admin/useAdminBlog";
import { ListCard } from "../components/ListCard";
import { Button } from "../components/Button";
import { RowActions } from "../components/RowActions";
import { confirmDelete } from "../components/confirmDelete";
import { DetailView } from "../components/DetailView";
import DefaultModal from "../dms/components/DefaultModal";
import { AdminBlogForm } from "./AdminBlogForm";
import "../dms/css/adminDisplays.css";
import "../admin.css";

type ModalState = { mode: "new" } | { mode: "edit"; id: number } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminBlogList() {
  const { data, isLoading } = useBlogList(1, 100);
  const deleteBlogPost = useDeleteBlogPost();
  const items = data?.items;
  const [modal, setModal] = useState<ModalState>(null);
  const [viewId, setViewId] = useState<number | null>(null);

  const viewItem = viewId !== null ? items?.find((item) => item.id === viewId) : undefined;

  async function handleDelete(id: number) {
    if (await confirmDelete("blog post")) {
      deleteBlogPost.mutate(id);
    }
  }

  return (
    <ListCard
      title="Blog"
      action={
        <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
          + New
        </Button>
      }
    >
      {isLoading ? (
        <p>Loading...</p>
      ) : !items?.length ? (
        <div className="admin-empty-state">No blog posts yet.</div>
      ) : (
        <div className="admin-card-grid">
          {items.map((item) => (
            <div className="card admin-item-card" key={item.id}>
              <div className="admin-item-card-header">
                <div className="admin-item-card-heading">
                  <div className="admin-item-card-icon">
                    <i className="fa-solid fa-blog"></i>
                  </div>
                  <div>
                    <h3 className="admin-item-card-title">{item.title}</h3>
                    <p className="admin-item-card-subtitle">/{item.slug}</p>
                  </div>
                </div>
                <div className="admin-item-card-actions">
                  <RowActions
                    onView={() => setViewId(item.id)}
                    onEdit={() => setModal({ mode: "edit", id: item.id })}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
              </div>
              {item.tags && (
                <div className="admin-chip-row">
                  {item.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span className="admin-chip" key={tag}>
                        {tag}
                      </span>
                    ))}
                </div>
              )}
              <span className="admin-item-card-meta">
                <i className="fa-solid fa-calendar-days"></i>
                {formatDate(item.publishedDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {viewItem && (
        <DefaultModal
          title="Blog Post Details"
          onClose={() => setViewId(null)}
          showFooter={false}
          size="lg"
          component={
            <DetailView
              fields={[
                { label: "Title", value: viewItem.title },
                { label: "Slug", value: `/${viewItem.slug}` },
                { label: "Published", value: formatDate(viewItem.publishedDate) },
                { label: "Tags", value: viewItem.tags },
                { label: "Content", value: viewItem.content },
              ]}
            />
          }
        />
      )}

      {modal && (
        <DefaultModal
          title={modal.mode === "edit" ? "Edit Blog Post" : "New Blog Post"}
          onClose={() => setModal(null)}
          showFooter={false}
          size="lg"
          component={
            <AdminBlogForm id={modal.mode === "edit" ? modal.id : undefined} onSaved={() => setModal(null)} />
          }
        />
      )}
    </ListCard>
  );
}
