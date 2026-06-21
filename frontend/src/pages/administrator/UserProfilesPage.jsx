import { useState } from "react";
import { Eye, ArrowLeft } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const profiles = [
  {
    profile_type: "Admin",
    access_level: "Full Access",
    status: "Active",
    description:
      "Manages platform content, user accounts, expert approvals, and platform monitoring. Cannot trade or manage portfolios.",
  },
  {
    profile_type: "Expert",
    access_level: "Limited Access",
    status: "Active",
    description:
      "Can provide investment guidance, manage advice articles, and support investors. Must be approved by admin before accessing expert features.",
  },
  {
    profile_type: "Investor",
    access_level: "Basic Access",
    status: "Active",
    description:
      "Can view stock information, manage watchlist, paper trade, and access investment services. Premium subscription unlocks additional features.",
  },
];

function UserProfilesPage() {
  const [selectedProfile, setSelectedProfile] = useState(null);

  if (selectedProfile) {
    return (
      <AdminPage
        title="Profile Details"
        subtitle="View detailed information about this role"
      >
        <button
          onClick={() => setSelectedProfile(null)}
          className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to User Profiles
        </button>

        <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{selectedProfile.profile_type}</h1>
            <span className="bg-green-100 text-green-600 px-3 py-1 rounded text-xs font-semibold">
              {selectedProfile.status}
            </span>
          </div>

          <hr className="mb-8" />

          <div className="grid grid-cols-2 gap-10 mb-8">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">PROFILE TYPE</p>
              <p className="text-lg">{selectedProfile.profile_type}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">ACCESS LEVEL</p>
              <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-semibold">
                {selectedProfile.access_level}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">STATUS</p>
              <p className="text-lg">{selectedProfile.status}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">DESCRIPTION</p>
            <p className="text-slate-600 text-lg leading-relaxed">
              {selectedProfile.description}
            </p>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="User Profiles" subtitle="Fixed system roles — read only">
      <div className="space-y-5">
        {profiles.map((profile) => (
          <div key={profile.profile_type} className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-lg">{profile.profile_type}</h3>
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-semibold">
                {profile.status}
              </span>
              <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-semibold ml-1">
                {profile.access_level}
              </span>
            </div>

            <p className="text-slate-600 mb-4">{profile.description}</p>

            <button
              onClick={() => setSelectedProfile(profile)}
              className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-2 rounded text-sm"
            >
              <Eye size={14} /> View Details
            </button>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

export default UserProfilesPage;
