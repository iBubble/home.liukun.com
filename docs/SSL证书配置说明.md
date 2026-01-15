# SSL证书配置说明

## ✓ 证书申请成功

证书已成功申请并安装到服务器，有效期：**2026年1月8日 至 2026年4月8日**（90天）

## 证书文件位置

- **私钥**: `/www/server/panel/vhost/cert/home.liukun.com/privkey.pem`
- **证书**: `/www/server/panel/vhost/cert/home.liukun.com/fullchain.pem`

## 宝塔面板配置步骤

### 1. 登录宝塔面板
访问宝塔面板管理界面

### 2. 进入SSL配置
- 点击左侧菜单 **网站**
- 找到 **ibubble.vicp.net** 站点
- 点击 **设置**
- 选择 **SSL** 选项卡

### 3. 配置证书
- 选择 **其他证书** 选项
- 在 **密钥(KEY)** 框中粘贴私钥内容
- 在 **证书(PEM格式)** 框中粘贴证书内容

### 4. 证书内容

#### 私钥 (KEY)
```
-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIKq0B4uqBF6hLKHU0RYvGTLl0lp9BKzzJfWumjdw8MhkoAoGCCqGSM49
AwEHoUQDQgAEA7YCCSu2+UPkOTl4n7koimsAbOJCz20Pa52ZzHT9qAuX0c8nZK69
hsH+f3ZtjoYAq3jxfQAGtjEHTAOxKtPzGA==
-----END EC PRIVATE KEY-----
```

#### 证书 (PEM)
```
-----BEGIN CERTIFICATE-----
MIIDkzCCAxmgAwIBAgISBiG9Xj8d4W34eqns9KnIqB4XMAoGCCqGSM49BAMDMDIx
CzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQDEwJF
NzAeFw0yNjAxMDgxMjA5NDdaFw0yNjA0MDgxMjA5NDZaMBoxGDAWBgNVBAMTD2hv
bWUubGl1a3VuLmNvbTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABAO2AgkrtvlD
5Dk5eJ+5KIprAGziQs9tD2udmcx0/agLl9HPJ2SuvYbB/n92bY6GAKt48X0ABrYx
B0wDsSrT8xijggIlMIICITAOBgNVHQ8BAf8EBAMCB4AwHQYDVR0lBBYwFAYIKwYB
BQUHAwEGCCsGAQUFBwMCMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFFsg50JLd34d
3cOH0yn+34Rl7lSdMB8GA1UdIwQYMBaAFK5IntyHHUSgb9qi5WB0BHjCnACAMDIG
CCsGAQUFBwEBBCYwJDAiBggrBgEFBQcwAoYWaHR0cDovL2U3LmkubGVuY3Iub3Jn
LzAaBgNVHREEEzARgg9ob21lLmxpdWt1bi5jb20wEwYDVR0gBAwwCjAIBgZngQwB
AgEwLQYDVR0fBCYwJDAioCCgHoYcaHR0cDovL2U3LmMubGVuY3Iub3JnLzI0LmNy
bDCCAQwGCisGAQQB1nkCBAIEgf0EgfoA+AB+AKXJeJJdV0YXgocN2IlmC1xVZIt9
AEDy7AdoUdGIaRn3AAABm5244SYACAAABQAuR3fVBAMARzBFAiArgqjGGzj1KTCC
cdjGeD7OabqZvk5CkOi+ZcxS0ZbPHAIhAPDtElP7LV8eub/LHtB8lRs0cl/Yfb3k
LHkJAMspYFCZAHYADleUvPOuqT4zGyyZB7P3kN+bwj1xMiXdIaklrGHFTiEAAAGb
nbjhFgAABAMARzBFAiEAzsb6fMawagR0lPGYZR+s9uCtCJwkHAWrW0qulvSs/OIC
IFEmNMV5awbCv80Y2mLSJnuYaOcR/nfj232itrsPeZwbMAoGCCqGSM49BAMDA2gA
MGUCMQDIEIDN0UlJlTgzuIMcu5Ry0KJN1OiDYeS7v8uuK1R6GH7jdsOdjDJJIr/g
VwelSGECMBiiqJGAvKmJxQxLH4PPj7wHcW0C0+TVmXebs8FK/ES2ApfXl9P9Nn5G
U1h/L/LxTw==
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIEVzCCAj+gAwIBAgIRAKp18eYrjwoiCWbTi7/UuqEwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMjQwMzEzMDAwMDAw
WhcNMjcwMzEyMjM1OTU5WjAyMQswCQYDVQQGEwJVUzEWMBQGA1UEChMNTGV0J3Mg
RW5jcnlwdDELMAkGA1UEAxMCRTcwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAARB6AST
CFh/vjcwDMCgQer+VtqEkz7JANurZxLP+U9TCeioL6sp5Z8VRvRbYk4P1INBmbef
QHJFHCxcSjKmwtvGBWpl/9ra8HW0QDsUaJW2qOJqceJ0ZVFT3hbUHifBM/2jgfgw
gfUwDgYDVR0PAQH/BAQDAgGGMB0GA1UdJQQWMBQGCCsGAQUFBwMCBggrBgEFBQcD
ATASBgNVHRMBAf8ECDAGAQH/AgEAMB0GA1UdDgQWBBSuSJ7chx1EoG/aouVgdAR4
wpwAgDAfBgNVHSMEGDAWgBR5tFnme7bl5AFzgAiIyBpY9umbbjAyBggrBgEFBQcB
AQQmMCQwIgYIKwYBBQUHMAKGFmh0dHA6Ly94MS5pLmxlbmNyLm9yZy8wEwYDVR0g
BAwwCjAIBgZngQwBAgEwJwYDVR0fBCAwHjAcoBqgGIYWaHR0cDovL3gxLmMubGVu
Y3Iub3JnLzANBgkqhkiG9w0BAQsFAAOCAgEAjx66fDdLk5ywFn3CzA1w1qfylHUD
aEf0QZpXcJseddJGSfbUUOvbNR9N/QQ16K1lXl4VFyhmGXDT5Kdfcr0RvIIVrNxF
h4lqHtRRCP6RBRstqbZ2zURgqakn/Xip0iaQL0IdfHBZr396FgknniRYFckKORPG
yM3QKnd66gtMst8I5nkRQlAg/Jb+Gc3egIvuGKWboE1G89NTsN9LTDD3PLj0dUMr
OIuqVjLB8pEC6yk9enrlrqjXQgkLEYhXzq7dLafv5Vkig6Gl0nuuqjqfp0Q1bi1o
yVNAlXe6aUXw92CcghC9bNsKEO1+M52YY5+ofIXlS/SEQbvVYYBLZ5yeiglV6t3S
M6H+vTG0aP9YHzLn/KVOHzGQfXDP7qM5tkf+7diZe7o2fw6O7IvN6fsQXEQQj8TJ
UXJxv2/uJhcuy/tSDgXwHM8Uk34WNbRT7zGTGkQRX0gsbjAea/jYAoWv0ZvQRwpq
Pe79D/i7Cep8qWnA+7AE/3B3S/3dEEYmc0lpe1366A/6GEgk3ktr9PEoQrLChs6I
tu3wnNLB2euC8IKGLQFpGtOO/2/hiAKjyajaBP25w1jF0Wl8Bbqne3uZ2q1GyPFJ
YRmT7/OXpmOH/FVLtwS+8ng1cAmpCujPwteJZNcDG0sF2n/sc0+SQf49fdyUK0ty
+VUwFj9tmWxyR/M=
-----END CERTIFICATE-----
```

### 5. 保存并启用
- 点击 **保存** 按钮
- 启用SSL
- 建议开启 **强制HTTPS** 选项

### 6. 验证配置
配置完成后，访问以下地址验证：
- https://home.liukun.com （正常，无警告）
- https://ibubble.vicp.net （会有域名不匹配警告，但连接仍然加密）

## 自动续期

acme.sh已自动配置证书续期任务，会在证书到期前自动续期。

查看cron任务：
```bash
crontab -l | grep acme
```

手动续期命令（如需要）：
```bash
/home/gemini/.acme.sh/acme.sh --renew -d home.liukun.com --ecc --force
```

## 注意事项

1. **域名不匹配警告**: `ibubble.vicp.net` 使用 `home.liukun.com` 的证书会显示域名不匹配警告，这是正常的。如果需要完全消除警告，需要为 `ibubble.vicp.net` 单独申请证书（但由于是动态DDNS，无法通过DNS验证）。

2. **证书有效期**: Let's Encrypt证书有效期为90天，acme.sh会自动续期。

3. **宝塔面板更新**: 如果证书自动续期后，需要在宝塔面板重新粘贴新证书内容。

## 相关文件

- 申请脚本: `setup-ssl-single.sh`
- 申请日志: `ssl-single-apply.log`
- 证书目录: `/home/gemini/.acme.sh/home.liukun.com_ecc/`
- 宝塔证书目录: `/www/server/panel/vhost/cert/home.liukun.com/`
