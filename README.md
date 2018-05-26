# Proxy-for-telegram

Прокси скрипт для работы телеграм.

**Используемые адреса**

  nl13.postls.com:443
  nl5.postls.com:443
  nl6.postls.com:443
  uk8.postls.com:443
  uk19.postls.com:443

**Закрываем доступ для сетей Mail.ru (https://t.me/zatelecom/4773):**

	ufw deny from nl13.postls.com:443
	ufw deny from 5.61.232.0/21
	ufw deny from 79.137.157.0/24
	ufw deny from 79.137.174.0/23
	ufw deny from 79.137.183.0/24
	ufw deny from 94.100.176.0/20
	ufw deny from 95.163.32.0/19
	ufw deny from 95.163.212.0/22
	ufw deny from 95.163.216.0/22
	ufw deny from 95.163.248.0/21
	ufw deny from 128.140.168.0/21
	ufw deny from 178.22.88.0/21
	ufw deny from 178.237.16.0/20
	ufw deny from 178.237.29.0/24
	ufw deny from 185.5.136.0/22
	ufw deny from 185.16.148.0/22
	ufw deny from 185.16.244.0/23
	ufw deny from 185.16.246.0/24
	ufw deny from 185.16.247.0/24
	ufw deny from 188.93.56.0/21
	ufw deny from 194.186.63.0/24
	ufw deny from 195.211.20.0/22
	ufw deny from 195.218.168.0/24
	ufw deny from 217.20.144.0/20
	ufw deny from 217.69.128.0/20
	sudo ufw enable
