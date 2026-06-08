import { motion } from "framer-motion";
import { getExpertInformation } from "../../api/userApi.js";

function EditProfilePage() {
    return (
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

        </motion.div>
    )
}
export default EditProfilePage;