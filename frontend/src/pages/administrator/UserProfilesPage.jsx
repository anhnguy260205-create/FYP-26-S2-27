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
  return (
    <AdminPage title="User Profiles" subtitle="Fixed system roles — read only">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mb-6 text-sm text-blue-700">
        These are fixed system roles. Roles cannot be created, edited, or deleted.
        To manage individual user accounts, go to <strong>User Accounts</strong>.
      </div>

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

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">PROFILE TYPE</p>
                <p className="text-sm text-slate-700">{profile.profile_type}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">ACCESS LEVEL</p>
                <p className="text-sm text-slate-700">{profile.access_level}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">STATUS</p>
                <p className="text-sm text-slate-700">{profile.status}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">DESCRIPTION</p>
              <p className="text-sm text-slate-600 leading-relaxed">{profile.description}</p>
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

export default UserProfilesPage;
