import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../auth/Header';
import Footer from '../auth/Footer';
import MouseEffectCard from '../ui/MouseEffectCard';
import Head from '../seo/Head';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 20 } } };

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-google transition-colors duration-300 relative selection:bg-indigo-500/30">
      <Head 
        title="プライバシーポリシー" 
        description="Discord Web Token Clientにおける個人情報やトークンの取り扱いに関するポリシーです。安全な利用環境への取り組みについて説明しています。"
        path="/privacy"
      />
      <Header />
      
      <div className="flex-grow flex flex-col relative">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <MouseEffectCard className="w-full h-full bg-transparent border-none rounded-none" />
        </div>
        
        <main className="container mx-auto max-w-4xl py-32 px-6 flex-grow relative z-10">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold mb-12 tracking-tight text-gray-900 dark:text-white">プライバシーポリシー</motion.h1>
            
            <div className="space-y-12 text-gray-600 dark:text-gray-300 leading-relaxed font-google">
              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>1. トークンの取り扱い
                </h2>
                <p>入力されたDiscordトークンは、サーバーを介してDiscord公式APIとのリアルタイム通信のみに使用されます。当サーバー側にトークンが永続的に保存されることはありません。ブラウザのタブを閉じる、またはログアウトすることでメモリから即座に破棄されます。</p>
              </motion.section>

              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>2. ログイン履歴（Cookie）
                </h2>
                <p>利便性の向上のため、ログインに成功したアカウントの情報（ユーザー名、ID、アバター、トークン）をブラウザのCookieに保存します。これは利用者の端末内にのみ保持され、開発者が外部から収集・閲覧することはありません。</p>
              </motion.section>

              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>3. ログの収集
                </h2>
                <p>サーバーでは、セキュリティ維持およびトラブルシューティングを目的に、アクセス日時やエラーログを最小限記録する場合があります。ただし、チャットメッセージの内容やプライベートな情報を収集・閲覧することはありません。</p>
              </motion.section>
            </div>
          </motion.div>
        </main>
      </div>

      <Footer />
    </div>
  );
}