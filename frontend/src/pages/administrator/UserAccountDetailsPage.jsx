import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminPage from "../../layout/AdminPage.jsx";

function UserAccountDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/useraccounts/${userId}`
      );
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        alert("User not found");
        navigate("/adminpanel/useraccounts");
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      alert("Failed to fetch user details");
    }
  };

  if (!user) {
    return (
      <AdminPage title="Account Details" subtitle="View and manage user information">
        <p className="text-white">Loading...</p>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Account Details" subtitle="View and manage user information">
      <button
        onClick={() => navigate("/adminpanel/useraccounts")}
        className="mb-3 bg-white text-slate-700 px-4 py-2 rounded text-sm font-medium"
      >
        ← Back to User Accounts
      </button>

      <div className="bg-white rounded-lg shadow-sm w-full p-10">
        <div className="flex items-center gap-4 pb-6 border-b">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
            {user.initials}
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">{user.full_name}</h3>
            <div className="flex gap-2 mt-1">
              <span className="px-3 py-1 rounded bg-green-100 text-green-600 text-xs font-semibold">
                {user.account_status}
              </span>
              <span className="px-3 py-1 rounded bg-blue-100 text-blue-600 text-xs font-semibold">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-32 gap-y-10 mt-8">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Full Name</p>
            <p className="text-lg text-slate-900 mt-1">{user.full_name}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Email Address</p>
            <p className="text-lg text-slate-900 mt-1">{user.email_address}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Phone Number</p>
            <p className="text-lg text-slate-900 mt-1">{user.phone_number}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">User Type</p>
            <p className="text-lg text-slate-900 mt-1">{user.role}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Address</p>
            <p className="text-lg text-slate-900 mt-1">{user.address}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Account Status</p>
            <p className="text-lg text-slate-900 mt-1">{user.account_status}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Join Date</p>
            <p className="text-lg text-slate-900 mt-1">{user.join_date}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Last Login</p>
            <p className="text-lg text-slate-900 mt-1">{user.last_login}</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">Password</p>
            <p className="text-sm text-slate-900 mt-1">********</p>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

export default UserAccountDetailsPage;