import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const posts = {
  post1: {
    title: "Best Investment Strategies for 2026",
    author: "John Doe",
    date: "May 5, 2026 at 02:30 PM",
    category: "Investment Strategy",
    content:
      "I have been researching different investment strategies and wanted to share my findings with the community. After analyzing market trends, I believe diversification across tech and renewable energy sectors offers the best potential returns. What are your thoughts on this approach?",
    comments: [
      {
        author: "Jane Smith",
        date: "May 5, 2026 at 03:45 PM",
        content:
          "Great insights! I agree that renewable energy is a promising sector. Have you considered emerging markets as well?",
      },
      {
        author: "Mike Johnson",
        date: "May 5, 2026 at 04:20 PM",
        content:
          "Diversification is key. I would also add some stable dividend stocks to balance the portfolio risk.",
      },
    ],
  },
};

function CommunityPostDetailsPage() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const post = posts[postId] || posts.post1;

  return (
    <AdminPage title="Post Details" subtitle="Review post content and comments">
      <button
        onClick={() => navigate("/adminpanel/posts")}
        className="mb-4 bg-white text-slate-700 px-4 py-2 rounded text-sm font-medium"
      >
        ← Back to Community Posts
      </button>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-lg p-6">
          <h3 className="text-xl font-bold text-slate-900">{post.title}</h3>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              {post.author[0]}
            </span>
            <span>{post.author}</span>
            <span>•</span>
            <span>{post.date}</span>
            <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded font-semibold">
              {post.category}
            </span>
          </div>

          <p className="text-sm text-slate-700 mt-5 leading-6">{post.content}</p>
        </div>

        <div className="bg-white rounded-lg p-6">
          <h3 className="text-lg font-bold mb-5">Comments ({post.comments.length})</h3>

          <div className="space-y-5">
            {post.comments.map((comment, index) => (
              <div key={index} className="border-b last:border-b-0 pb-4">
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs">
                      {comment.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>

                    <div>
                      <p className="font-semibold text-sm">{comment.author}</p>
                      <p className="text-xs text-slate-500">{comment.date}</p>
                    </div>
                  </div>

                  <button className="flex items-center gap-1 text-red-600 text-sm">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

                <p className="text-sm text-slate-700 mt-3 ml-11">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export default CommunityPostDetailsPage;