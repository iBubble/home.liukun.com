<?php
/**
 * 数据库连接
 */

function getDatabase() {
    static $db = null;
    
    if ($db === null) {
        $dbFile = __DIR__ . '/../data/nodes.db';
        $dataDir = __DIR__ . '/../data';
        
        // 确保data目录存在
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0775, true);
        }
        
        // 如果数据库不存在,先初始化
        if (!file_exists($dbFile)) {
            require_once __DIR__ . '/init_db.php';
        }
        
        try {
            $db = new PDO('sqlite:' . $dbFile);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new Exception('数据库连接失败: ' . $e->getMessage());
        }
    }
    
    return $db;
}
