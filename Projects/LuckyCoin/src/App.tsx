import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Main from './pages/Main';
import Story from './pages/Story';
import Characters from './pages/Characters';
import Director from './pages/Director';
import Crowdfunding from './pages/Crowdfunding';
import Investor from './pages/Investor';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
