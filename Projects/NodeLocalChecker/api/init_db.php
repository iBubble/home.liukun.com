<?php
/**
 * 初始化数据库
 * 创建节点存储表
 */

// 数据库配置
$dbFile = __DIR__ . '/../data/nodes.db';
$dataDir = __DIR__ . '/../data';

// 确保data目录存在
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

try {
    $db = new PDO('sqlite:' . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 创建节点表
    $db->exec("
        CREATE TABLE IF NOT EXISTS nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_hash TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            server TEXT NOT NULL,
            port INTEGER NOT NULL,
            raw_data TEXT NOT NULL,
            available INTEGER DEFAULT NULL,
            latency TEXT DEFAULT NULL,
            real_ip TEXT DEFAULT NULL,
            purity_data TEXT DEFAULT NULL,
            last_check_time INTEGER DEFAULT NULL,
            check_count INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    ");
    
    // 创建索引
    $db->exec("CREATE INDEX IF NOT EXISTS idx_node_hash ON nodes(node_hash)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_server ON nodes(server)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_available ON nodes(available)");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_last_check ON nodes(last_check_time)");
    
    // 创建更新日志表
    $db->exec("
        CREATE TABLE IF NOT EXISTS update_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            nodes_added INTEGER DEFAULT 0,
            nodes_updated INTEGER DEFAULT 0,
            nodes_removed INTEGER DEFAULT 0,
            total_nodes INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        )
    ");
    
    echo "✓ 数据库初始化成功\n";
    echo "数据库位置: $dbFile\n";
    
} catch (PDOException $e) {
    echo "✗ 数据库初始化失败: " . $e->getMessage() . "\n";
    exit(1);
}
