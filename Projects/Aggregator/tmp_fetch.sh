#!/bin/bash
COOKIE=$(cat linuxdo_cookie.txt)
curl -s -L -x "http://127.0.0.1:7912" \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0' \
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8' \
  -H 'Accept-Language: en-US,en;q=0.5' \
  -H "Cookie: $COOKIE" \
  "https://linux.do/t/topic/1638381" > tmp_out.html

ls -l tmp_out.html
head -n 20 tmp_out.html | cut -c 1-100
