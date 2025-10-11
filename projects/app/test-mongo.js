const mongoose = require('mongoose');

const uris = [
    'mongodb+srv://harbour:zfwKR8diTuCBjsKH@harbour.5xcyddv.mongodb.net/?retryWrites=true&w=majority',
    'mongodb+srv://harbour:zfwKR8diTuCBjsKH@harbour.5xcyddv.mongodb.net/fastgpt?retryWrites=true&w=majority',
    'mongodb+srv://harbour:zfwKR8diTuCBjsKH@harbour.5xcyddv.mongodb.net/?retryWrites=true&w=majority&serverSelectionTimeoutMS=30000',
    'mongodb+srv://harbour:zfwKR8diTuCBjsKH@harbour.5xcyddv.mongodb.net/?retryWrites=true&w=majority&appName=harbour'
];

async function testConnection(uri, index) {
    console.log(`\n测试连接 ${index + 1}...`);
    console.log(`URI: ${uri.replace(/:[^:@]+@/, ':****@')}`);

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        });
        console.log('✅ 连接成功！');
        await mongoose.disconnect();
        return true;
    } catch (error) {
        console.log('❌ 连接失败:', error.message);
        return false;
    }
}

(async () => {
    for (let i = 0; i < uris.length; i++) {
        const success = await testConnection(uris[i], i);
        if (success) {
            console.log('\n🎉 找到可用的连接字符串！');
            process.exit(0);
        }
    }
    console.log('\n😞 所有连接尝试都失败了');
    process.exit(1);
})();