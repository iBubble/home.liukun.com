import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 懒加载页面组件以实现代码分割
const Home = lazy(() => import('./pages/Home'));
const Main = lazy(() => import('./pages/Main'));
const Story = lazy(() => import('./pages/Story'));
const Characters = lazy(() => import('./pages/Characters'));
const Director = lazy(() => import('./pages/Director'));
const Crowdfunding = lazy(() => import('./pages/Crowdfunding'));
const Investor = lazy(() => import('./pages/Investor'));

// 加载中组件
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-black">
      <div className="text-center space-y-4">
        <div className="text-6xl animate-spin">💰</div>
        <p className="text-xl text-yellow-400 font-chinese">加载中...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/Projects/LuckyCoin">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/main" element={<Main />}>
            <Route index element={<Navigate to="/main/story" replace />} />
            <Route path="story" element={<Story />} />
            <Route path="characters" element={<Characters />} />
            <Route path="director" element={<Director />} />
            <Route path="crowdfunding" element={<Crowdfunding />} />
            <Route path="investor" element={<Investor />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
