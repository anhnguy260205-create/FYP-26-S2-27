import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getConsultations, replyConsultation } from "../../api/featureApi.js";

export default function ExpertConsultationPage() {
  const [questions, setQuestions] = useState([]);
  const [selectedQ, setSelectedQ] = useState(null);
  const [replyText, setReplyText] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const expertId = currentUser?.user_id;

  const loadConsultations = () => {
    if (expertId) {
      getConsultations(expertId).then(res => {
        if(res.success) setQuestions(res.questions);
      });
    }
  };

  useEffect(() => { loadConsultations(); }, [expertId]);

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    const res = await replyConsultation(selectedQ.id, replyText);
    if(res.success) {
      alert("Official Advisory reply transmitted successfully!");
      setReplyText("");
      setSelectedQ(null);
      loadConsultations();
    }
  };

  return (
    <motion.div className="min-h-screen flex flex-col bg-slate-950 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-8">Secure Consultation Desk</h1>

        {!selectedQ ? (
          <div className="space-y-4">
            {questions.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No communication requests registered in your terminal.</p>
            ) : (
              questions.map(q => (
                <div key={q.id} onClick={() => setSelectedQ(q)} className="p-5 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 flex justify-between items-center transition-all">
                  <div>
                    <h3 className="font-bold text-lg">{q.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">Client: {q.client} | Ticker Asset: {q.ticker || "N/A"}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${q.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                    {q.status.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <button onClick={() => setSelectedQ(null)} className="text-gray-400 text-sm mb-6 hover:text-white transition-colors">← Back to Inbox Desk</button>
            <h2 className="text-xl font-bold mb-2">{selectedQ.title}</h2>
            <p className="text-cyan-400 text-sm font-bold mb-6">TARGET SYMBOL FLUID: #{selectedQ.ticker || "GENERAL"}</p>
            <div className="bg-black/30 p-4 rounded-lg mb-8 border border-white/5 text-gray-300 whitespace-pre-wrap">
              {selectedQ.content}
            </div>

            {selectedQ.status === "replied" ? (
              <div className="bg-cyan-950/40 border border-cyan-500/30 p-5 rounded-lg">
                <h4 className="text-xs font-bold text-cyan-400 mb-2 tracking-wider">TRANSMITTED OFFICIAL ADVISORY DOSSIER</h4>
                <p className="text-gray-200 whitespace-pre-wrap">{selectedQ.reply}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 tracking-wider">COMPILE ADVISORY COUNSEL REPLY</h4>
                <textarea rows="6" value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500" placeholder="Type your professional review and guidance parameters..." />
                <button onClick={handleReplySubmit} className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-bold hover:opacity-90 transition-opacity">
                  Transmit Advisory Document
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}