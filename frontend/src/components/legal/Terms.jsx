import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../auth/Header';
import Footer from '../auth/Footer';
import MouseEffectCard from '../ui/MouseEffectCard';
import Head from '../seo/Head';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 20 } } };

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-google transition-colors duration-300 relative selection:bg-indigo-500/30">
      <Head 
        title="利用規約" 
        description="Discord Web Token Clientの利用規約です。本サービスの利用に関するルールや免責事項についてご確認いただけます。"
        path="/terms"
      />
      <Header />
      
      <div className="flex-grow flex flex-col relative">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <MouseEffectCard className="w-full h-full bg-transparent border-none rounded-none" />
        </div>
        
        <main className="container mx-auto max-w-4xl py-32 px-6 flex-grow relative z-10">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold mb-12 tracking-tight text-gray-900 dark:text-white">利用規約</motion.h1>
            
            <div className="space-y-12 text-gray-600 dark:text-gray-300 leading-relaxed font-google">
              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>1. はじめに
                </h2>
                <p>Discord Web Token Client（以下「本プロジェクト」）は、個人の学習およびフィルタリング回避の補助を目的としたオープンソースプロジェクトです。利用者は、本規約に同意した上で本サービスを利用するものとします。</p>
              </motion.section>

              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>2. 自己責任の原則
                </h2>
                <p>本サービスでユーザー名義のトークン（Self-bot）を使用することは、Discord公式のサービス利用規約（ToS）に違反する可能性があります。本サービスの利用によりアカウントが停止、削除、または制限された場合でも、開発者は一切の責任を負いません。すべて利用者の自己責任において利用してください。</p>
              </motion.section>

              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>3. 禁止事項
                </h2>
                <ul className="list-disc ml-5 space-y-3 text-gray-600 dark:text-gray-300">
                  <li>スパム、嫌がらせ、またはDiscordサーバーの運営を妨害する行為。</li>
                  <li>自動化されたスクリプト等による過度な負荷をかける行為。</li>
                  <li>他人のトークンを不正に取得・使用する行為。</li>
                </ul>
              </motion.section>

              <motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>4. 免責事項
                </h2>
                <p>開発者は本サービスの正確性、完全性、安全性を保証しません。本サービスの利用に関連して生じた直接的・間接的な損害について、一切の責任を負いません。</p>
              </motion.section>
            </div>
          </motion.div>
        </main>
      </div>

      <Footer />
    </div>
  );
}