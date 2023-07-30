##
from requests import get  # main tool for getting the page source
import shutil  # to save image locally
from bs4 import BeautifulSoup  # html parser
from time import sleep

import collections
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import seaborn as sns
import altair as alt
import numpy as np
from vega_datasets import data
import plotly.express as px
import plotly.io as pio
import os 
##
from selenium import webdriver
from selenium.webdriver.support.select import Select
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

options = webdriver.FirefoxOptions()
#options.add_argument('--headless')
#options.add_argument('--no-sandbox')
options.add_argument(f'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36')
#options.add_argument(f'user-agent={ua.random}')
options.add_argument('--disable-blink-features=AutomationControlled')
options.add_argument('--disable-dev-shm-usage')
# open it, go to a website, and get results
options.add_argument("start-maximized")
            

pd.set_option('display.max_rows', 50)
pd.set_option('display.max_columns', 500)
pd.set_option('display.width', 1000)
##


current_page = f'https://www.goodreads.com/review/list/91708300-danilo-fiumi?ref=nav_mybooks'
#current_page='https://fbref.com/en/squads/68449f6d/Spezia-Stats'

response = get(current_page)
if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'html.parser')
else:
    print('errore nella chiamata')

##
# ----------------------------- selezione tabella ---------------------------- #




""" soup = BeautifulSoup(tabella, 'html.parser') """

my_dict = {"titolo":[],"link":[],"immagine":[]};
table = soup.find('table', attrs={'id':'books'})
table_body = table.find('tbody')

rows = table_body.find_all('tr')
for row in rows:
    cover = row.find_all('td', attrs={'class':'field cover'})
    title = row.find_all('td', attrs={'class':'field title'})
    link=cover[0].a["href"]
    img=cover[0].img["src"]
    tit = title[0].text.replace('title', '').strip()
    
    my_dict["titolo"].append(tit)
    my_dict["immagine"].append(img)
    my_dict["link"].append(link)
    


libri=pd.DataFrame(my_dict)

##
df=pd.read_csv('libri_letti.csv')
df=df[['titolo', 'link', 'immagine', 'good_img']]

to_fill=libri.append(df).drop_duplicates(['link'],keep='last')
to_fill=to_fill[to_fill['good_img'].isna()]

urls=["https://www.goodreads.com/"+elem for elem in to_fill.link.tolist()]



##


##
good_img=[]
autore=[]
driver = webdriver.Firefox(options=options)
for current_page in urls:
    ##
    #current_page=urls[5]
    pass
    
    driver.get(current_page)
    try:
        WebDriverWait(driver, timeout=3).until(lambda d: d.find_element(By.CLASS_NAME,'BookCover'))
    except Exception:
        driver.get(current_page)
        WebDriverWait(driver, timeout=3).until(lambda d: d.find_element(By.CLASS_NAME,'BookCover'))
        #print(traceback.format_exc())
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    
    
    cover = soup.find_all('div', attrs={'class':'bookCoverPrimary'})
    try:
        print(cover[0].img["src"])
    except IndexError:
        cover=soup.find_all('div', attrs={'class':'BookCover'})
        
        
        
    good_img.append(cover[0].img["src"])
##
to_fill["good_img"]=good_img

final=to_fill.append(df)


final.to_csv('libri_letti.csv')


final.to_json('libri_letti.json',orient="records")
##
