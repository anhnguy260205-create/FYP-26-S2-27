import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Edit, Ban, Search } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const profiles = [
  {
    profile_type: "Administrator",
    access_level: "Full Access",
    status: "Active",
    description:
      "Full system access with user management, content moderation, and configuration capabilities.",
  },
  {
    profile_type: "Consultant",
    access_level: "Limited Access",
    status: "Active",
    description:
      "Can provide investment guidance, manage advice articles, and support investors.",
  },
  {
    profile_type: "Investor",
    access_level: "Basic Access",
    status: "Active",
    description:
      "Can view stock information, manage watchlist, and access investment services.",
  },
];

function UserProfilesPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");

  const filteredProfiles = profiles.filter((profile) =>
    profile.profile_type.toLowerCase().includes(keyword.toLowerCase())
  );

  return (
    <AdminPage title="User Profiles" subtitle="View and manage user profile types">
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by profile type, access level or description..."
              className="w-full border rounded-lg pl-10 pr-4 py-3 text-sm"
            />
          </div>

          <button className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">
            Search
          </button>

          <button className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">
            Create Profile
          </button>
        </div>

        <p className="text-sm text-slate-600 mt-4">
          Showing {filteredProfiles.length} profile type(s)
        </p>
      </div>

      <div className="space-y-5">
        {filteredProfiles.map((profile) => (
          <div key={profile.profile_type} className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-lg">{profile.profile_type}</h3>
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-semibold">
                {profile.status}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/adminpanel/profiles/${profile.profile_type}`)}
                className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-2 rounded text-sm"
              >
                <Eye size={14} /> View
              </button>

              <button className="flex items-center gap-1 border border-orange-500 text-orange-600 px-3 py-2 rounded text-sm">
                <Edit size={14} /> Update
              </button>

              <button className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded text-sm">
                <Ban size={14} /> Suspend
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

export default UserProfilesPage;