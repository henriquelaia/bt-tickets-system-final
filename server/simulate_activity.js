const login = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
        });
        const data = await res.json();
        return data.token;
    } catch (e) {
        console.error('Login failed', e);
    }
};

const postComment = async (token) => {
    try {
        await fetch('http://localhost:3000/api/tickets/1/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: 'Real-time test comment from script 🚀' })
        });
        console.log('Comment posted');
    } catch (e) {
        console.error('Post comment failed', e);
    }
};

const run = async () => {
    console.log('Waiting 10s...');
    await new Promise(r => setTimeout(r, 10000));
    const token = await login();
    if (token) {
        console.log('Logged in, posting comment...');
        await postComment(token);
    }
};

run();
