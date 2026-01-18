import { useNavigate } from 'react-router-dom';
import SlotMachine from '../../components/SlotMachine';
import type { Mode } from '../../styles/colors';

export default function Home() {
  const navigate = useNavigate();

  const handleResult = (mode: Mode) => {
    // 转场到主页面
    setTimeout(() => {
      navigate('/main');
    }, 1000);
  };

  return (
    <div className="min-h-screen">
      <SlotMachine onResult={handleResult} />
    </div>
  );
}
