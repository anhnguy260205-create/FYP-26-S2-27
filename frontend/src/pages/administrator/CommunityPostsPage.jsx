import { useNavigate } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const posts = [
  {
    id: "post1",
    title: "Best Investment Strategies for 2026",
    author: "John Doe",
    date: "May 5, 2026 at 02:30 PM",
    category: "Investment Strategy",
    content:
      "I have been researching different investment strategies and wanted to share my findings with the community. After analyzing market trends, I believe diversification across tech and renewable energy sectors offers the best potential returns.",
    comments: 2,
  },
  {
    id: "post2",
    title: "Question about Risk Management",
    author: "Sarah Williams",
    date: "May 4, 2026 at 10:15 AM",
    category: "Risk Management",
    content:
      "I am new to investing and want to understand more about managing risk in my portfolio. What percentage of my portfolio should I allocate to high-risk investments versus safe assets?",
    comments: 1,
  },
  {
    id: "post3",
    title: "Real Estate vs Stock Market Investment",
    author: "Emma Davis",
    date: "May 3, 2026 at 09:00 AM",
    category: "Investment Comparison",
    content:
      "I have been debating whether to invest in real estate or continue building my stock portfolio. Real estate offers tangible assets and rental income, but stocks provide better liquidity.",
    comments: 3,
  },
];

function CommunityPostsPage() {
  const navigate = useNavigate();

  return (
    <AdminPage title="Community Management" subtitle="Monitor and review community discussions">
      <div className="bg-white rounded-lg p-6">
        <p className="text-sm text-slate-600 mb-5">Showing {posts.length} post(s)</p>

        <div className="space-y-5">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-5">
              <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
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

              <p className="text-sm text-slate-700 mt-4 leading-6">{post.content}</p>

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-slate-500">{post.comments} comments</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/adminpanel/posts/${post.id}`)}
                    className="flex items-center gap-1 border px-3 py-2 rounded text-sm"
                  >
                    <Eye size={14} /> View Details
                  </button>

                  <button className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded text-sm">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminPage>
  );
}

export default CommunityPostsPage;