
from subprocess import Popen, PIPE, STDOUT
p = Popen(['python',r'-m','http.server',"8080"], stdout=PIPE, stderr=STDOUT)
print("Process ID:", p.pid)



##
from requests import get  # main tool for getting the page source
from bs4 import BeautifulSoup  # html parser
from time import sleep
import os


path_list=[ item for item in next(os.walk(r'./'))[2] if item.endswith(".html") ]

""" f = open(path_list[1], 'r')
txt_html=f.read() """


endpoint=path_list[2]
current_page = f'http://localhost:8080/{endpoint}'

##
import traceback
from selenium import webdriver
from selenium.webdriver.support.select import Select
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')

options.add_argument(f'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36')
options.add_argument('--disable-blink-features=AutomationControlled')
options.add_argument('--disable-dev-shm-usage')
# open it, go to a website, and get results
options.add_argument("start-maximized")
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)            

driver_path=r'C:\Users\danil\Documents\projects\airbnb\chromedriver.exe'

driver = webdriver.Chrome(options=options,executable_path=driver_path)

#agent = driver.execute_script("return navigator.userAgent")	
driver.get(current_page)
WebDriverWait(driver, timeout=10).until(lambda d: d.find_element(By.TAG_NAME,'p'))
##
import unicodedata
dcd=unicodedata.normalize('NFKD', driver.page_source).encode('ascii', 'ignore')



page=dcd.decode("utf-8")

center=page.find('gfetch.js')

first=page[:page.find('gfetch.js')].rfind('<script')
last=page[page.find('gfetch.js'):].find('</script>')

to_replace=page[first:(center-first+first+len('gfetch.js')+last)]

new_replace='<!-- '+to_replace+' -->'
if to_replace!='':
    page=page.replace(to_replace, new_replace)
""" f = open(f'SSR_html/{endpoint}', 'w') """
f = open(f'rendered.html', 'w')
f.write(page)
f.close()


##
##

##




p.kill()