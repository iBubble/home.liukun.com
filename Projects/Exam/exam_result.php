<?php
require_once 'inc/db.inc.php';
require_once 'inc/functions.inc.php';
startStudentSession();
checkStudentLogin();
ensurePaperScheduleColumns($pdo);

$exam_record_id = isset($_GET['exam_record_id']) ? intval($_GET['exam_record_id']) : 0;

if ($exam_record_id <= 0) {
    header('Location: records.php');
    exit;
}

// 获取考试记录
$stmt = $pdo->prepare("SELECT er.*, p.title as paper_title, p.total_score as paper_total_score, p.start_time, p.end_time, p.is_paused, s.name as subject_name 
                       FROM exam_records er 
                       JOIN papers p ON er.paper_id = p.id 
                       LEFT JOIN subjects s ON p.subject_id = s.id 
                       WHERE er.id = ? AND er.student_id = ?");
$stmt->execute([$exam_record_id, $_SESSION['student_id']]);
$exam_record = $stmt->fetch();

if (!$exam_record) {
    header('Location: records.php');
    exit;
}
$state = getPaperActiveState($exam_record);
if (!$state['active']) {
    $reason = urlencode($state['reason'] ?? '');
    header('Location: records.php?msg=paper_inactive' . ($reason ? '&reason=' . $reason : ''));
    exit;
}

// 获取答题详情
$stmt = $pdo->prepare("SELECT ar.*, q.question_text, q.correct_answer, q.answer_analysis, q.option_a, q.option_b, q.option_c, q.option_d 
                       FROM answer_records ar 
                       JOIN questions q ON ar.question_id = q.id 
                       WHERE ar.exam_record_id = ? ORDER BY ar.id");
$stmt->execute([$exam_record_id]);
$answers = $stmt->fetchAll();

// 获取设置
$stmt = $pdo->query("SELECT setting_key, setting_value FROM settings WHERE setting_key = 'show_answer_after_submit'");
$setting = $stmt->fetch();
$show_answer = $setting['setting_value'] ?? '1';
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>考试结果 - <?php echo escape(getSiteTitle()); ?></title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="alternate icon" href="/favicon.svg">
    <link rel="stylesheet" href="css/style.css?v=<?php echo time(); ?>">
    <script>
        const funnyWarnings = [
            { emoji: '😏', text: '嘿嘿，想复制？没门！' },
            { emoji: '🤭', text: '偷偷摸摸的想干嘛呢？' },
            { emoji: '😎', text: '别白费力气了，专心刷题吧！' },
            { emoji: '🙈', text: '我看不见，你也别想复制！' },
            { emoji: '🦸', text: '系统保护已启动，禁止复制！' },
            { emoji: '🔒', text: '内容已加密，复制无效哦~' },
            { emoji: '🎭', text: '此路不通，请走正门！' },
            { emoji: '🚫', text: '禁止操作！专心学习才是王道！' },
            { emoji: '💪', text: '靠实力刷题，不靠复制！' },
            { emoji: '🎯', text: '想作弊？系统第一个不答应！' },
            { emoji: '😤', text: '哼！想复制？门都没有！' },
            { emoji: '🤖', text: 'AI监控中，禁止复制操作！' },
            { emoji: '🛡️', text: '防护盾已开启，复制被拦截！' },
            { emoji: '⚡', text: '电击警告！禁止复制！' },
            { emoji: '🎪', text: '这里是学习马戏团，不是复制工厂！' },
            { emoji: '🐱', text: '小猫说：不可以复制哦~' },
            { emoji: '🦉', text: '猫头鹰盯着你呢，别想复制！' },
            { emoji: '🌙', text: '月亮代表系统，禁止复制！' },
            { emoji: '⭐', text: '星星在看着你，老实刷题吧！' },
            { emoji: '🔥', text: '系统很生气，后果很严重！' }
        ];
        function showFunnyWarning() {
            const warning = funnyWarnings[Math.floor(Math.random() * funnyWarnings.length)];
            const toast = document.createElement('div');
            toast.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border: 3px solid #ffc107; border-radius: 20px; padding: 30px 40px; box-shadow: 0 10px 40px rgba(255, 193, 7, 0.5); z-index: 99999; text-align: center; font-size: 20px; font-weight: 600; color: #856404; animation: popIn 0.3s ease, fadeOut 0.3s ease 2s forwards; min-width: 300px;';
            toast.innerHTML = '<div style="font-size: 48px; margin-bottom: 15px;">' + warning.emoji + '</div><div>' + warning.text + '</div>';
            document.body.appendChild(toast);
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2300);
        }
        const style = document.createElement('style');
        style.textContent = '@keyframes popIn { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(1.1); } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } } @keyframes fadeOut { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } }';
        document.head.appendChild(style);
        document.addEventListener('DOMContentLoaded', function() {
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); showFunnyWarning(); return false; });
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 65 || e.keyCode === 86 || e.keyCode === 88 || e.keyCode === 83)) {
                    e.preventDefault(); showFunnyWarning(); return false;
                }
                if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
                    e.preventDefault(); showFunnyWarning(); return false;
                }
            });
            document.onselectstart = function() { showFunnyWarning(); return false; };
            document.ondragstart = function() { showFunnyWarning(); return false; };
        });
    </script>
    <script>
        <?php include 'inc/inactivity_reminder.inc.php'; ?>
    </script>
</head>
<body>
    <header class="main-header">
        <div class="header-content">
            <h1>
                <img src="/favicon.svg" alt="<?php echo escape(getSiteTitle()); ?>" class="logo-img" style="width: 40px; height: 40px; display: block;">
                <?php echo escape(getSiteTitle()); ?><?php echo getSiteEmoji(); ?>
            </h1>
            <div class="user-info">
                <span>
                    学号：<?php echo escape($_SESSION['student_no']); ?>
                    <?php if (!empty($_SESSION['student_name'])): ?>
                        | 姓名：<?php echo escape($_SESSION['student_name']); ?>
                    <?php endif; ?>
                    <?php if (!empty($_SESSION['student_class'])): ?>
                        | 班级：<?php echo escape($_SESSION['student_class']); ?>
                    <?php endif; ?>
                </span>
                <a href="exam_list.php">考试</a>
                <a href="records.php">我的记录</a>
                <a href="wrong_questions.php">错题本</a>
                <a href="logout.php">退出</a>
                <a href="help_student.php">使用说明</a>
            </div>
        </div>
    </header>
    
    <div class="container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; flex-wrap: wrap; gap: 15px;">
            <h2 style="margin: 0;">考试结果</h2>
            <?php 
            $correct_count = 0;
            foreach ($answers as $answer) {
                if ($answer['is_correct']) $correct_count++;
            }
            $total_count = count($answers);
            $accuracy = $total_count > 0 ? ($correct_count / $total_count * 100) : 0;
            ?>
            <div style="display: inline-flex; align-items: center; padding: 10px 20px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 12px; border: 2px solid rgba(102, 126, 234, 0.2);">
                <span style="font-size: 24px; margin-right: 10px;">📊</span>
                <span style="font-size: 18px; font-weight: 600; color: #667eea;">得分率 <?php echo number_format($accuracy, 1); ?>%</span>
            </div>
        </div>
        
        <?php
        $duration_value = $exam_record['duration'] ?? null;
        if ($duration_value === null || $duration_value === '') {
            if (!empty($exam_record['start_time']) && !empty($exam_record['end_time'])) {
                $start = strtotime($exam_record['start_time']);
                $end = strtotime($exam_record['end_time']);
                if ($start !== false && $end !== false && $end > $start) {
                    $duration_value = $end - $start;
                }
            }
        }
        $duration = intval($duration_value ?? 0);
        ?>
        
        <div class="result-card">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; text-align: left;">
                <div>
                    <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">试卷名称</p>
                    <p style="font-size: 18px; font-weight: 600; color: #2c3e50;"><?php echo escape($exam_record['paper_title']); ?></p>
                </div>
                <div>
                    <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">科目</p>
                    <p style="font-size: 18px; font-weight: 600; color: #2c3e50;"><?php echo escape($exam_record['subject_name'] ?? ''); ?></p>
                </div>
                <div>
                    <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">得分</p>
                    <p style="font-size: 28px; font-weight: 700; color: #667eea;">
                        <?php echo number_format($exam_record['score'], 2); ?>
                        <span style="font-size: 18px; color: #7f8c8d;">/ <?php echo $exam_record['total_score']; ?> 分</span>
                    </p>
                </div>
                <div>
                    <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">正确率</p>
                    <p style="font-size: 24px; font-weight: 700; color: <?php echo $accuracy >= 60 ? '#27ae60' : ($accuracy >= 40 ? '#f39c12' : '#e74c3c'); ?>;">
                        <?php echo number_format($accuracy, 1); ?>%
                    </p>
                </div>
                <div>
                    <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">用时</p>
                    <p style="font-size: 18px; font-weight: 600; color: #2c3e50;">
                        <?php 
                        if ($duration > 0) {
                            $minutes = floor($duration / 60);
                            $seconds = $duration % 60;
                            echo $minutes . '分' . $seconds . '秒';
                        } else {
                            echo '-';
                        }
                        ?>
                    </p>
                </div>
                <div>
                    <p style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">提交时间</p>
                    <p style="font-size: 16px; font-weight: 600; color: #2c3e50;"><?php echo $exam_record['end_time']; ?></p>
                </div>
            </div>
        </div>
        
        <?php if ($show_answer == '1'): ?>
        <div style="margin-top: 30px;">
            <h2>答题详情</h2>
            <?php foreach ($answers as $index => $answer): ?>
                <div class="question-card" style="border-left-color: <?php echo $answer['is_correct'] ? '#27ae60' : '#e74c3c'; ?>;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="margin: 0;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: <?php echo $answer['is_correct'] ? '#d4edda' : '#f8d7da'; ?>; color: <?php echo $answer['is_correct'] ? '#155724' : '#721c24'; ?>; border-radius: 8px; margin-right: 10px; font-weight: 600;">
                                <?php echo $index + 1; ?>
                            </span>
                            <?php echo nl2br(escape($answer['question_text'])); ?>
                        </h3>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <?php if ($answer['is_correct']): ?>
                                <span style="display: inline-flex; align-items: center; padding: 6px 12px; background: #d4edda; color: #155724; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                    ✓ 正确
                                </span>
                            <?php else: ?>
                                <span style="display: inline-flex; align-items: center; padding: 6px 12px; background: #f8d7da; color: #721c24; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                    ✗ 错误
                                </span>
                            <?php endif; ?>
                            <span style="color: #7f8c8d; font-size: 13px;">得分：<?php echo $answer['score']; ?>/<?php echo $answer['score'] > 0 ? $answer['score'] : '?'; ?></span>
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; line-height: 1.8;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 15px;">
                            <div style="padding: 12px; background: <?php echo $answer['is_correct'] ? '#d4edda' : '#f8d7da'; ?>; border-radius: 8px;">
                                <strong style="display: block; margin-bottom: 5px; color: #2c3e50;">你的答案：</strong>
                                <span style="color: <?php echo $answer['is_correct'] ? '#155724' : '#721c24'; ?>; font-weight: 600;">
                                    <?php echo escape($answer['student_answer'] ?? '未作答'); ?>
                                </span>
                            </div>
                            <div style="padding: 12px; background: #d4edda; border-radius: 8px;">
                                <strong style="display: block; margin-bottom: 5px; color: #2c3e50;">正确答案：</strong>
                                <span style="color: #155724; font-weight: 600;"><?php echo escape($answer['correct_answer']); ?></span>
                            </div>
                        </div>
                        
                        <?php if ($answer['option_a']): ?>
                            <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                                <p style="margin: 5px 0; padding: 8px; background: white; border-radius: 6px;">A. <?php echo escape($answer['option_a']); ?></p>
                                <p style="margin: 5px 0; padding: 8px; background: white; border-radius: 6px;">B. <?php echo escape($answer['option_b'] ?? ''); ?></p>
                                <p style="margin: 5px 0; padding: 8px; background: white; border-radius: 6px;">C. <?php echo escape($answer['option_c'] ?? ''); ?></p>
                                <p style="margin: 5px 0; padding: 8px; background: white; border-radius: 6px;">D. <?php echo escape($answer['option_d'] ?? ''); ?></p>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($answer['answer_analysis']): ?>
                            <div class="answer-detail">
                                <strong style="display: block; margin-bottom: 8px; color: #2c3e50;">答案解析：</strong>
                                <p style="margin: 0; color: #34495e;"><?php echo nl2br(escape($answer['answer_analysis'])); ?></p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
        
        <div style="text-align: center; margin: 40px 0;">
            <a href="exam_list.php" class="btn btn-primary" style="margin-right: 15px; padding: 14px 28px;">
                <span>继续刷题 →</span>
            </a>
            <a href="records.php" class="btn btn-warning" style="padding: 14px 28px;">
                <span>查看历史记录</span>
            </a>
        </div>
    </div>
    <?php include 'inc/footer.php'; ?>
</body>
</html>

