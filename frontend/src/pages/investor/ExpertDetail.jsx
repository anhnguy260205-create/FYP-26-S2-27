import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import {
    Star,
    Users,
    TrendingUp,
    Briefcase,
    MessageSquare,
    ArrowLeft,
} from "lucide-react";

function ExpertDetails() {
    const navigate = useNavigate();

    const expert = {
        name: "Dr. Raymond",
        role: "Technical Analysis Expert",
        experience: "15 Years",
        followers: "3.2K",
        rating: 4.8,
        returnRate: "+18.5%",
        specialization: "Global Markets",
        bio:
            "Experienced investment consultant specializing in technical analysis, portfolio construction, and global equity markets. Focused on helping investors identify opportunities while managing risk.",
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <GeneralHeader />

            <main className="flex-1 p-8">

                {/* Back Button */}
                <button
                    onClick={() => navigate("/investor/expertportfolio")}
                    className="flex items-center gap-2 mb-6"
                    style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                {/* Profile Card */}
                <div
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        padding: "30px",
                    }}
                >
                    <div className="flex justify-between items-center">

                        <div className="flex items-center gap-5">

                            <div
                                className="flex items-center justify-center"
                                style={{
                                    width: "80px",
                                    height: "80px",
                                    borderRadius: "50%",
                                    background:
                                        "linear-gradient(135deg,#155dfc,#0092b8)",
                                    fontSize: "24px",
                                    fontWeight: "700",
                                }}
                            >
                                DR
                            </div>

                            <div>
                                <h1 className="text-3xl font-bold">
                                    {expert.name}
                                </h1>

                                <p
                                    style={{
                                        color:
                                            "rgba(255,255,255,0.5)",
                                    }}
                                >
                                    {expert.role}
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-5 mt-8">

                        <div
                            className="p-5 rounded-xl"
                            style={{
                                background:
                                    "rgba(255,255,255,0.04)",
                            }}
                        >
                            <Star
                                size={20}
                                color="#f59e0b"
                            />
                            <h3 className="mt-2 text-xl font-bold">
                                {expert.rating}
                            </h3>
                            <p
                                style={{
                                    color:
                                        "rgba(255,255,255,0.45)",
                                }}
                            >
                                Rating
                            </p>
                        </div>

                        <div
                            className="p-5 rounded-xl"
                            style={{
                                background:
                                    "rgba(255,255,255,0.04)",
                            }}
                        >
                            <Users
                                size={20}
                                color="#60a5fa"
                            />
                            <h3 className="mt-2 text-xl font-bold">
                                {expert.followers}
                            </h3>
                            <p
                                style={{
                                    color:
                                        "rgba(255,255,255,0.45)",
                                }}
                            >
                                Followers
                            </p>
                        </div>

                        <div
                            className="p-5 rounded-xl"
                            style={{
                                background:
                                    "rgba(255,255,255,0.04)",
                            }}
                        >
                            <TrendingUp
                                size={20}
                                color="#22c55e"
                            />
                            <h3 className="mt-2 text-xl font-bold">
                                {expert.returnRate}
                            </h3>
                            <p
                                style={{
                                    color:
                                        "rgba(255,255,255,0.45)",
                                }}
                            >
                                Avg Return
                            </p>
                        </div>

                        <div
                            className="p-5 rounded-xl"
                            style={{
                                background:
                                    "rgba(255,255,255,0.04)",
                            }}
                        >
                            <Briefcase
                                size={20}
                                color="#a855f7"
                            />
                            <h3 className="mt-2 text-xl font-bold">
                                {expert.experience}
                            </h3>
                            <p
                                style={{
                                    color:
                                        "rgba(255,255,255,0.45)",
                                }}
                            >
                                Experience
                            </p>
                        </div>

                    </div>
                </div>

                {/* About Section */}
                <div
                    className="mt-6"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        padding: "30px",
                    }}
                >
                    <h2 className="text-xl font-bold mb-4">
                        About Consultant
                    </h2>

                    <p
                        style={{
                            color: "rgba(255,255,255,0.7)",
                            lineHeight: 1.8,
                        }}
                    >
                        {expert.bio}
                    </p>
                </div>

                {/* Portfolio Holdings */}
                <div
                    className="mt-6"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        padding: "30px",
                    }}
                >
                    <h2 className="text-xl font-bold mb-5">
                        Top Holdings
                    </h2>

                    <div className="grid grid-cols-3 gap-4">

                        {[
                            "AAPL",
                            "MSFT",
                            "NVDA",
                            "TSLA",
                            "GOOGL",
                            "AMZN",
                        ].map((stock) => (
                            <div
                                key={stock}
                                style={{
                                    padding: "18px",
                                    borderRadius: "12px",
                                    background:
                                        "rgba(255,255,255,0.03)",
                                    border:
                                        "1px solid rgba(255,255,255,0.05)",
                                }}
                            >
                                <h3 className="font-bold">
                                    {stock}
                                </h3>
                                <p
                                    style={{
                                        color:
                                            "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    Portfolio Asset
                                </p>
                            </div>
                        ))}

                    </div>
                </div>

                {/* Action */}
                <div className="flex justify-end mt-8">
                    <button
                        onClick={() =>
                            navigate("/investor/expertadvice")
                        }
                        className="flex items-center gap-2"
                        style={{
                            padding: "12px 28px",
                            borderRadius: "10px",
                            background:
                                "linear-gradient(90deg,#0092b8,#155dfc)",
                        }}
                    >
                        <MessageSquare size={16} />
                        Consult Expert
                    </button>
                </div>

            </main>

            <Footer />
        </motion.div>
    );
}

export default ExpertDetails;