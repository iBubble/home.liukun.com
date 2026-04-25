Host 192.168.64.2
  HostName 192.168.64.2
  User skills

Host 192.168.1.30
  HostName 192.168.1.30
  Port 22
  User Administrator
  ServerAliveInterval 60
  ServerAliveCountMax 3

Host gemini-server
  HostName ibubble.vicp.net
  Port 1022
  User gemini
  IdentityFile ~/.ssh/id_rsa
  ServerAliveInterval 60
  ServerAliveCountMax 3

Host gemini-server-Antigravity
  HostName ibubble.vicp.net
  Port 1022
  User gemini
  IdentityFile /Users/gemini/.ssh/id_rsa
  ServerAliveInterval 10
  ServerAliveCountMax 3
  TCPKeepAlive yes
  ExitOnForwardFailure yes
  CheckHostIP no
  StrictHostKeyChecking accept-new
  ControlMaster no

Host sy_frp_server
  HostName frp.liukun.com
  User root
  Port 22
  ServerAliveInterval 60
  ServerAliveCountMax 3
  RemoteForward 19898 127.0.0.1:7897

Host MacStudio-Remote
    HostName mac.syhsgis.com
    Port 50022
    User shengyao
    IdentityFile /Users/gemini/.ssh/id_rsa
    ServerAliveInterval 5
    ServerAliveCountMax 3
    TCPKeepAlive yes
    ControlMaster no
    Compression yes
    StrictHostKeyChecking no
    ConnectTimeout 15
    GSSAPIAuthentication no
    AddressFamily inet

Host tencent-server
  HostName b.liukun.com
  Port 22
  User root
  IdentityFile /Users/gemini/.ssh/id_rsa
  PreferredAuthentications publickey
  PubkeyAuthentication yes
  RemoteForward 8897 127.0.0.1:7897
  ServerAliveInterval 15
  ServerAliveCountMax 3
  ConnectTimeout 10
  ExitOnForwardFailure no

Host hk.liukun.com
  HostName hk.liukun.com
  User root
  Port 22
  IdentityFile /Users/gemini/.ssh/id_rsa
  PreferredAuthentications publickey
  PubkeyAuthentication yes
  ServerAliveInterval 15
  ServerAliveCountMax 3
  ConnectTimeout 10
  TCPKeepAlive yes
  StrictHostKeyChecking accept-new
  Compression yes

Host ububtu.syhsgis.com
  HostName ubuntu.syhsgis.com
  User shengyao
  Port 9022
  IdentityFile /Users/gemini/.ssh/id_rsa
  PreferredAuthentications publickey
  PubkeyAuthentication yes

Host us.liukun.com
  HostName us.liukun.com
  User gemini
  Port 22
  IdentityFile /Users/gemini/.ssh/id_rsa
  PreferredAuthentications publickey
  PubkeyAuthentication yes
  ServerAliveInterval 60
  ServerAliveCountMax 3

Host sg.liukun.com
  HostName sg.liukun.com
  User gemini
  Port 22
  IdentityFile ~/.ssh/id_rsa
  PreferredAuthentications publickey
  PubkeyAuthentication yes

Host hk1.liukun.com
  HostName hk1.liukun.com
  User gemini
  Port 22
  IdentityFile /Users/gemini/.ssh/id_rsa
  PreferredAuthentications publickey
  PubkeyAuthentication yes
  ServerAliveInterval 15
  ServerAliveCountMax 3
  ConnectTimeout 10
  TCPKeepAlive yes
  StrictHostKeyChecking accept-new
