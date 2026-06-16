import { useState } from "react";

function UserProfilePage() {
    const [profile, setProfile] = useState({
        username: "",
        full_name: "",
        email: "",
        phone: "",
        address: "",
    });

    const handleChange = (e) => {
        setProfile({
            ...profile,
            [e.target.name]: e.target.value,
        });
    };

    const handleSave = () => {
        console.log("Saved Profile:", profile);
        alert("Profile updated!");
    };

    return (
        <div style={{ padding: "20px" }}>
            <h1>User Profile</h1>

            <input
                type="text"
                name="username"
                placeholder="Username"
                value={profile.username}
                onChange={handleChange}
            />
            <br /><br />

            <input
                type="text"
                name="full_name"
                placeholder="Full Name"
                value={profile.full_name}
                onChange={handleChange}
            />
            <br /><br />

            <input
                type="email"
                name="email"
                placeholder="Email"
                value={profile.email}
                onChange={handleChange}
            />
            <br /><br />

            <input
                type="text"
                name="phone"
                placeholder="Phone Number"
                value={profile.phone}
                onChange={handleChange}
            />
            <br /><br />

            <input
                type="text"
                name="address"
                placeholder="Address"
                value={profile.address}
                onChange={handleChange}
            />
            <br /><br />

            <button onClick={handleSave}>
                Save Profile
            </button>
        </div>
    );
}

export default UserProfilePage;