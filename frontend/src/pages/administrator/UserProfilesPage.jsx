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
    profile_type: "Finance and Operations",
    access_level: "Full Access",
    status: "Active",
    description:
      "Responsible for reviewing and approving expert applications, and managing the platform's subscriptions, billing, and profit reporting.",
  },
  {
    profile_type: "Investor",
    access_level: "Basic Access / Premium Access",
    status: "Active",
    description:
      "Can view stock information, manage watchlist, paper trade, and access core investment services. Subscription tier (Basic or Premium) is an attribute of this account, not a separate profile type, and is managed via Subscription Management.",
    tiers: [
      {
        name: "Basic",
        access_level: "Basic Access",
        description: "Default tier. Paper trading, watchlist, and basic investment services.",
      },
      {
        name: "Premium",
        access_level: "Premium Access",
        description: "Paid tier. Adds AI stock predictions, expert consultations, and advanced portfolio management.",
      },
    ],
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
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

            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 mb-1">DESCRIPTION</p>
              <p className="text-sm text-slate-600 leading-relaxed">{profile.description}</p>
            </div>

            {profile.tiers && (
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">SUBSCRIPTION TIERS</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.tiers.map((tier) => (
                    <div key={tier.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{tier.name}</span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold">
                          {tier.access_level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{tier.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

export default UserProfilesPage;
