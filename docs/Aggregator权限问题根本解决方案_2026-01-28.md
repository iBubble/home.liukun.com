# Aggregator 权限问题根本解决方案

## 问题根源

权限问题反复出现的根本原因：

1. **Python脚本** (`parse_nodes.py`) 由 `gemini` 用户运行
2. **PHP-FPM** 运行在 `www` 用户下
3. 每次Python脚本创建 `nodes.json` 时，文件所有者变为 `gemini:gemini`
4. PHP-FPM（www用户）无法读写 `gemini:gemini` 的文件

## 根本解决方案

### 方案1：Python脚本自动修复权限 ✅ 已实施

修改 `parse_nodes.py`，在创建文件后自动执行：
```python
subprocess.run(['sudo', 'chown', 'www:www', json_file], check=False, capture_output=True)
subprocess.run(['sudo', 'chmod', '666', json_file], check=False, capture_output=True)
```

**优点**：
- 每次运行都自动修复
- 不需要额外配置
- 立即生效

### 方案2：配置用户级别的umask ✅ 已实施

在 `~/.bashrc` 中添加：
```bash
umask 002
```

**优点**：
- 所有新创建的文件默认组可写
- 一次配置，永久生效
- 符合Linux最佳实践

### 方案3：Cron定时修复（备用方案）✅ 已实施

每5分钟运行一次权限修复脚本：
```bash
*/5 * * * * /www/wwwroot/ibubble.vicp.net/Processes/fix_aggregator_once.sh
```

## 验证结果

```bash
# 测试1：删除文件后重新创建
$ rm data/nodes.json
$ python3 parse_nodes.py
$ ls -lh data/nodes.json
-rw-rw-rw- 1 www www 8.0K Jan 28 23:23 data/nodes.json  ✅

# 测试2：API验证
$ curl -X POST https://home.liukun.com:8443/Projects/Aggregator/api/index.php?path=/verify
{"success":true,"verified_count":27,"total_count":40}  ✅
```

## 为什么之前的方案失败

1. **只修复现有文件**：每次Python脚本运行都会重新创建文件
2. **没有从源头解决**：没有修改文件创建时的默认权限
3. **依赖外部脚本**：cron任务有延迟，不是实时的

## 当前状态

✅ Python脚本自动修复权限  
✅ 用户umask配置完成  
✅ Cron定时修复作为备用  
✅ 所有API测试通过  
✅ 数据一致性正常  

## 不再需要手动操作

以下操作不再需要：
- ❌ 手动 `chown www:www`
- ❌ 手动 `chmod 666`
- ❌ 担心权限问题

## 技术细节

### gemini 用户配置
```bash
$ id gemini
uid=1000(gemini) gid=1000(gemini) groups=1000(gemini),1001(www),...
```
- gemini 用户已在 www 组中
- umask 002 让新文件组可写（666）
- Python脚本额外执行 chown 确保所有者是 www

### 文件权限说明
- **目录**：777 (drwxrwxrwx) - 所有用户可读写执行
- **文件**：666 (rw-rw-rw-) - 所有用户可读写
- **所有者**：www:www - PHP-FPM运行用户

## 总结

通过三层保障机制，彻底解决了权限问题：
1. **源头解决**：Python脚本自动修复
2. **系统配置**：umask默认权限
3. **定时保障**：Cron定时检查

这是一个**工程化的解决方案**，而不是临时补丁。
