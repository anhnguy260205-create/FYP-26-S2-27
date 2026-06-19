import axios from "axios";

const API_BASE = "http://localhost:8000/api/features";

export const getExpertPortfolio = async (userId) => {
    const res = await axios.get(`${API_BASE}/portfolio/${userId}`);
    return res.data;
};

export const saveExpertPortfolio = async (portfolioData) => {
    const res = await axios.post(`${API_BASE}/portfolio/save`, portfolioData);
    return res.data;
};

export const getConsultations = async (expertId) => {
    const res = await axios.get(`${API_BASE}/consultations/${expertId}`);
    return res.data;
};

export const replyConsultation = async (questionId, replyContent) => {
    const res = await axios.post(`${API_BASE}/consultations/reply/${questionId}`, { reply_content: replyContent });
    return res.data;
};

export const fetchForumPosts = async () => {
    const res = await axios.get(`${API_BASE}/forum/posts`);
    return res.data;
};

export const createForumPost = async (postData) => {
    const res = await axios.post(`${API_BASE}/forum/posts/create`, postData);
    return res.data;
};

export const fetchForumPostDetail = async (postId) => {
    const res = await axios.get(`${API_BASE}/forum/posts/${postId}`);
    return res.data;
};

export const addForumComment = async (postId, userId, content) => {
    const res = await axios.post(`${API_BASE}/forum/posts/${postId}/comment`, { user_id: userId, content });
    return res.data;
};